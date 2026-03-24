import { NextRequest, NextResponse } from 'next/server'
import pool from '@/app/lib/database'
import { v4 as uuidv4 } from 'uuid'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const patientId = searchParams.get('patientId')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = `
      SELECT a.id, a.appointmentDate, a.appointmentTime, a.duration, a.type, a.status,
             a.providerName, a.notes,
             p.id as patientId, p.firstName, p.lastName, p.phone
      FROM appointments a
      JOIN patients p ON a.patientId = p.id
    `

    let params: any[] = []

    if (date) {
      query += ` WHERE a.appointmentDate = ?`
      params.push(date)
    } else if (patientId) {
      query += ` WHERE a.patientId = ?`
      params.push(patientId)
    }

    query += ` ORDER BY a.appointmentDate ASC, a.appointmentTime ASC LIMIT ? OFFSET ?`
    params.push(limit, offset)

    const [appointments]: any = await pool.execute(query, params)

    const [totalResult]: any = await pool.execute(`SELECT COUNT(*) as count FROM appointments`)
    const total = totalResult[0].count

    const formattedAppointments = appointments.map((row: any) => ({
      id: row.id,
      appointmentDate: row.appointmentDate,
      appointmentTime: row.appointmentTime,
      duration: row.duration,
      type: row.type,
      status: row.status,
      providerName: row.providerName,
      notes: row.notes,
      patient: {
        id: row.patientId,
        firstName: row.firstName,
        lastName: row.lastName,
        phone: row.phone
      }
    }))

    return NextResponse.json({ success: true, data: formattedAppointments, total })
  } catch (error: any) {
    console.error('Appointments API error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { patientId, appointmentDate, appointmentTime, duration, type, providerName } = body

    if (!patientId || !appointmentDate || !appointmentTime) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    const appointmentId = uuidv4()

    await pool.execute(
      `INSERT INTO appointments 
      (id, patientId, appointmentDate, appointmentTime, duration, type, providerName, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        appointmentId,
        patientId,
        appointmentDate,
        appointmentTime,
        duration || 30,
        type || 'Consultation',
        providerName || 'Dr. Smith',
        'SCHEDULED'
      ]
    )

    return NextResponse.json({ success: true, message: 'Appointment created' })
  } catch (error: any) {
    console.error(error)
    return NextResponse.json({ success: false, error: 'Failed to create appointment' }, { status: 500 })
  }
}
