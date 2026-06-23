import { UseCaseDispatcher } from '@modules/notifications/application/services/useCase.dispatcher';
import { Resend } from 'resend';
import { env } from '@/common/secrets/env';
import { Twilio } from 'twilio';
import { EmailNotificationsStrategy } from '@modules/notifications/infrastructure/notification-strategies/EmailNotifications.strategy';
import { SMSNotificationsStrategy } from '@modules/notifications/infrastructure/notification-strategies/SMSNotifications.strategy';
import { DefaultMessageUseCase } from '@modules/notifications/application/useCases/DefaultMessage.useCase';
import { InAppNotificationsStrategy } from '@modules/notifications/infrastructure/notification-strategies/InAppNotifications.strategy';
import { IFanOutService } from '@modules/notifications/application/abstractions/FanOutService.interface';
import { IInboxRepository } from '@modules/notifications/application/abstractions/inbox/InboxRepository.interface';
import { IUserNotificationsRepository } from '@modules/notifications/application/abstractions/userNotifications/UserNotificationsRepository.interface';
import { IFeedRepository } from '@modules/notifications/application/abstractions/feed/FeedRepository.interface';
import { IChannelStrategy } from '@modules/notifications/application/abstractions/notifications';
import {
  DEFAULT_MESSAGE_EVENT_TYPES,
  IChannelTypes,
} from '@modules/notifications/application/abstractions/incomingQueueTypes';
import { AccountCreatedUseCase } from '@modules/notifications/application/useCases/AccountCreated.useCase';
import { userEventNames } from '@modules/notifications/application/abstractions/incomingQueueTypes/user.types';

export function useCasesBuilder(
  fanout: IFanOutService,
  inbox: IInboxRepository,
  userRepo: IUserNotificationsRepository,
  feedRepository: IFeedRepository,
) {
  const useCaseDispatcher = new UseCaseDispatcher();

  const resend = new Resend(env.RESEND_PASSWORD);
  const twilio = new Twilio(env.TWILIO_SID, env.TWILIO_TOKEN);

  const emailStrategy = new EmailNotificationsStrategy(
    resend,
    env.RESEND_EMAIL,
  );
  const smsStrategy = new SMSNotificationsStrategy(twilio, ''); //TODO
  const inappSender = new InAppNotificationsStrategy(fanout, feedRepository);
  const strategyMap = new Map<IChannelTypes, IChannelStrategy>();
  strategyMap.set('email', emailStrategy);
  strategyMap.set('inapp', inappSender);
  strategyMap.set('sms', smsStrategy);

  const defaultMessageUseCase = new DefaultMessageUseCase(
    inbox,
    strategyMap,
    userRepo,
  );
  const accountCreatedUseCase = new AccountCreatedUseCase(userRepo);

  createUseCaseDispatcher(
    useCaseDispatcher,
    defaultMessageUseCase,
    accountCreatedUseCase,
  );

  return useCaseDispatcher;
}

function createUseCaseDispatcher(
  dispatcher: UseCaseDispatcher,
  defaultMessage: DefaultMessageUseCase,
  accountCreatedUseCase: AccountCreatedUseCase,
) {
  dispatcher.register(userEventNames.account_created, accountCreatedUseCase);

  for (const type of DEFAULT_MESSAGE_EVENT_TYPES) {
    dispatcher.register(type, defaultMessage);
  }
}
