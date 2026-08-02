import { type NextRequest } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { createHandler } from '@/lib/api-handler';
import { AuthenticationError, ConflictError, NotFoundError, ValidationError } from '@/lib/errors';

const schema = z.object({ reason: z.string().trim().min(5).max(500), evidenceUrl: z.string().url().optional() }).strict();
export async function POST(req: NextRequest, context: { params: Promise<{ id: string; fulfillmentId: string }> }) {
 return createHandler(async request => {
  const session=await getSession(); if(!session) throw new AuthenticationError();
  const key=request.headers.get('idempotency-key'); if(!key) throw new ValidationError('Idempotency-Key là bắt buộc');
  const {id,fulfillmentId}=await context.params; const input=schema.parse(await request.json());
  const fulfillment=await prisma.sellerFulfillment.findFirst({where:{id:fulfillmentId,orderId:id,order:{userId:session.userId}},include:{order:true}});
  if(!fulfillment) throw new NotFoundError('Không tìm thấy kiện hàng');
  if(fulfillment.status!=='delivered'||!fulfillment.deliveredAt) throw new ConflictError('Chỉ được trả kiện đã giao');
  if(Date.now()-fulfillment.deliveredAt.getTime()>7*86_400_000) throw new ConflictError('Đã quá hạn trả hàng 7 ngày');
  return prisma.fulfillmentReturn.create({data:{fulfillmentId,requesterId:session.userId,reason:input.reason,evidenceUrl:input.evidenceUrl,idempotencyKey:key}});
 })(req);
}