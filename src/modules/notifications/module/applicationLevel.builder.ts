import { UseCaseDispatcher } from '@modules/notifications/application/services/useCase.dispatcher';
import { Resend } from 'resend';
import { env } from '@/common/secrets/env';
import { Twilio } from 'twilio';

export function useCasesBuilder() {
  const useCaseDispatcher = new UseCaseDispatcher();
  const resend = new Resend(env.RESEND_PASSWORD);
  const twilio = new Twilio(env.TWILIO_SID, env.TWILIO_TOKEN);
}
