import axios, { AxiosInstance } from 'axios'

interface ClinicSession {
  accessToken: string
  refreshToken?: string
  expiresAt: number
  clinicId: string
  practiceId: string
}

class AthenaAPI {
  private client: AxiosInstance
  private session: ClinicSession | null = null

  constructor(session?: ClinicSession) {
    this.session = session
    this.client = axios.create({
      baseURL: process.env.ATHENA_BASE_URL!,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })

    this.client.interceptors.request.use(async (config) => {
      if (this.session?.accessToken) {
        config.headers['Authorization'] = `Bearer ${this.session.accessToken}`
      }
      return config
    })

    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          throw new Error('Session expired. Please login again.')
        }
        return Promise.reject(error)
      }
    )
  }

  private validateSession() {
    if (!this.session) {
      throw new Error('No clinic session available. Please login.')
    }
    if (Date.now() > this.session.expiresAt) {
      throw new Error('Session expired. Please login again.')
    }
  }

  // Patient Management - FHIR R4 and v1 API
  async searchPatients(params: any = {}) {
    this.validateSession()
    const contextId = this.session!.practiceId
    const { given, family, name, birthdate, gender, identifier, _count, ...otherParams } = params
    
    // Use FHIR R4 if we have proper FHIR search parameters
    if (given || family || name || birthdate || gender || identifier) {
      const fhirParams: any = {
        'ah-practice': `Organization/a-1.Practice-${contextId}`,
        '_count': _count || '10'
      }
      
      if (given) fhirParams.given = given
      if (family) fhirParams.family = family
      if (name) fhirParams.name = name
      if (birthdate) fhirParams.birthdate = birthdate
      if (gender) fhirParams.gender = gender
      if (identifier) fhirParams.identifier = identifier
      
      const response = await this.client.get('/fhir/r4/Patient', {
        params: fhirParams,
        headers: {
          'Accept': 'application/fhir+json'
        }
      })
      return { success: true, data: response.data, type: 'fhir' }
    }
    
    // Fallback to v1 API for other searches
    const { firstname, lastname, dob } = otherParams
    if (firstname && lastname && dob) {
      const searchParams = { firstname, lastname, dob }
      const response = await this.client.get(`/v1/${contextId}/patients/enhancedbestmatch`, {
        params: searchParams
      })
      return { success: true, data: response.data, type: 'v1' }
    } else {
      const response = await this.client.get(`/v1/${contextId}/patients`, {
        params: otherParams
      })
      return { success: true, data: response.data, type: 'v1' }
    }
  }

  async getPatient(patientId: string) {
    this.validateSession()
    const contextId = this.session!.practiceId
    const response = await this.client.get(`/v1/${contextId}/patients/${patientId}`)
    return { success: true, data: response.data }
  }

  async createPatient(patientData: any) {
    this.validateSession()
    const contextId = this.session!.practiceId
    try {
      const response = await this.client.post(`/v1/${contextId}/patients`, patientData)
      return { success: true, data: response.data }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async updatePatient(patientId: string, updates: any) {
    this.validateSession()
    const contextId = this.session!.practiceId
    try {
      const response = await this.client.put(`/v1/${contextId}/patients/${patientId}`, updates)
      return { success: true, data: response.data }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  // Appointment Management - v1 API
  async getAppointments(params: any = {}) {
    this.validateSession()
    const contextId = this.session!.practiceId
    const response = await this.client.get(`/v1/${contextId}/appointments`, { params })
    return { success: true, data: response.data }
  }

  // Appointment Confirmation Status
  async getAppointmentConfirmationStatus(contextId: string = '195900', params: any = {}) {
    const response = await this.client.get(`/v1/${contextId}/reference/appointmentconfirmationstatus`, { params })
    return { success: true, data: response.data }
  }



  // Hospital Beds
  async getBeds(contextId: string = '195900', params: any = {}) {
    const response = await this.client.get(`/v1/${contextId}/beds`, { params })
    return { success: true, data: response.data }
  }



  // Test connection
  async testConnection() {
    this.validateSession()
    const contextId = this.session!.practiceId
    
    console.log('Testing Athena connection for clinic:', this.session!.clinicId)
    
    try {
      // Test user info endpoint
      const userResponse = await this.client.get('/oauth2/v1/userinfo')
      console.log('User info response:', userResponse.status)
      
      // Test FHIR R4 with user scope
      const fhirResponse = await this.client.get('/fhir/r4/Patient', {
        params: {
          'ah-practice': `Organization/a-1.Practice-${contextId}`,
          '_count': '1'
        },
        headers: {
          'Accept': 'application/fhir+json'
        }
      })
      
      return {
        success: true,
        data: {
          user: userResponse.data,
          fhir: fhirResponse.data
        },
        message: `Connected to ${this.session!.clinicId} - OAuth working`
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        message: 'Connection test failed'
      }
    }
  }

  // Get multiple patients by ID range
  async getPatientRange(startId: number = 60117, endId: number = 60190, contextId: string = '195900') {
    const patients = []
    const errors = []
    
    for (let id = startId; id <= endId; id++) {
      try {
        const response = await this.client.get(`/v1/${contextId}/patients/${id}`)
        if (response.data && response.data.length > 0) {
          patients.push({ id, data: response.data[0] })
        }
      } catch (error: any) {
        if (error.response?.status !== 404) {
          errors.push({ id, error: error.message })
        }
      }
    }
    
    return {
      success: true,
      patients,
      errors,
      total: patients.length
    }
  }
}

export default AthenaAPI