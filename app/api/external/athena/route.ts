import { NextRequest, NextResponse } from 'next/server'
import AthenaAPI from '@/app/lib/athena-api'
import { cookies } from 'next/headers'

function getClinicSession() {
  const sessionCookie = cookies().get('athena_session')
  if (!sessionCookie) {
    throw new Error('No clinic session found')
  }
  
  try {
    return JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString())
  } catch (error) {
    throw new Error('Invalid session data')
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    
    // Get clinic session from OAuth
    const session = getClinicSession()
    const athenaAPI = new AthenaAPI(session)

    switch (action) {
      case 'test':
        console.log('Testing Athena connection for clinic:', session.clinicId)
        
        const result = await athenaAPI.testConnection()
        console.log('Athena test result:', result)
        return NextResponse.json(result)
      
      case 'search-patients':
        const patientParams = {
          // FHIR R4 parameters
          given: searchParams.get('given'),
          family: searchParams.get('family'),
          name: searchParams.get('name'),
          birthdate: searchParams.get('birthdate'),
          gender: searchParams.get('gender'),
          identifier: searchParams.get('identifier'),
          _count: searchParams.get('_count') || '10',
          // v1 API parameters (fallback)
          firstname: searchParams.get('firstname'),
          lastname: searchParams.get('lastname'),
          dob: searchParams.get('dob'),
          limit: searchParams.get('limit') || '10'
        }
        Object.keys(patientParams).forEach(
          (key) => patientParams[key as keyof typeof patientParams] === null && delete patientParams[key as keyof typeof patientParams]
        )
        return NextResponse.json(await athenaAPI.searchPatients(patientParams))
      
      case 'patient':
        const patientId = searchParams.get('id')
        if (!patientId) {
          return NextResponse.json({ success: false, error: 'Patient ID required' })
        }
        return NextResponse.json(await athenaAPI.getPatient(patientId))
      
      case 'patient-range':
        const startId = parseInt(searchParams.get('startId') || '60117')
        const endId = parseInt(searchParams.get('endId') || '60190')
        return NextResponse.json(await athenaAPI.getPatientRange(startId, endId, session.practiceId))
      
      case 'appointments':
        const appointmentParams = {
          departmentid: searchParams.get('departmentid'),
          appointmentid: searchParams.get('appointmentid'),
          startdate: searchParams.get('startdate'),
          enddate: searchParams.get('enddate'),
          limit: searchParams.get('limit'),
          offset: searchParams.get('offset')
        }
        Object.keys(appointmentParams).forEach(
          (key) => appointmentParams[key as keyof typeof appointmentParams] === null && delete appointmentParams[key as keyof typeof appointmentParams]
        )
        
        return NextResponse.json(
          await athenaAPI.getAppointments(appointmentParams)
        )
      
      case 'appointment-confirmation-status':
        const confirmationParams = {
          offset: searchParams.get('offset') || '0',
          limit: searchParams.get('limit') || '100'
        }
        return NextResponse.json(
          await athenaAPI.getAppointmentConfirmationStatus(contextId, confirmationParams)
        )
      

      
      case 'beds':
        const bedParams = {
          departmentid: searchParams.get('departmentid'),
          bedid: searchParams.get('bedid'),
          unitid: searchParams.get('unitid'),
          hospitalroomid: searchParams.get('hospitalroomid'),
          limit: searchParams.get('limit') || '1500',
          offset: searchParams.get('offset') || '0'
        }
        Object.keys(bedParams).forEach(
          (key) => bedParams[key as keyof typeof bedParams] === null && delete bedParams[key as keyof typeof bedParams]
        )
        return NextResponse.json(await athenaAPI.getBeds(contextId, bedParams))
      
      default:
        return NextResponse.json({ success: false, error: 'Invalid action' })
    }
  } catch (error: any) {
    console.error('Athena API error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

