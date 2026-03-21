import { getCurrentUser } from '@/lib/auth'
import { generateQRPayload } from '@/lib/qr'
import { db } from '@/lib/db'

export async function GET() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'STUDENT') {
    return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 })
  }

  // Generar payload sin studioId
  const payload = await generateQRPayload(user.id)

  // Obtener membresía activa para mostrar en el carnet
  const activeOrder = await db.membershipOrder.findFirst({
    where: {
      studentId: user.id,
      status:    'ACTIVE',
      expiresAt: { gt: new Date() },
    },
    include: { plan: true },
    orderBy: { expiresAt: 'desc' },
  })

  const latestLedger = await db.creditLedger.findFirst({
    where:   { studentId: user.id },
    orderBy: { createdAt: 'desc' },
  })

  return Response.json({
    payload,
    studentName: user.name,
    planName:    activeOrder?.plan.name ?? null,
    credits:     latestLedger?.balance ?? 0,
    expiresAt:   activeOrder?.expiresAt ?? null,
    status:      activeOrder?.status ?? null,
  })
}
