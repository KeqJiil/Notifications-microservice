import {
  EventDispatcher,
  Handler,
} from '@modules/notifications/infrastructure/kafka/dispatchers/event.dispatcher';
import { IOutboxHandler } from '@modules/notifications/application/abstractions/outbox/IOutboxHandler.interface';
import { startAuthKafkaConsumer } from '@modules/notifications/infrastructure/kafka/consumers/auth.consumer';
import { startUserKafkaConsumer } from '@modules/notifications/infrastructure/kafka/consumers/user.consumer';
import { startImportantKafkaConsumer } from '@modules/notifications/infrastructure/kafka/consumers/important.consumer';
import { startReviewKafkaConsumer } from '@modules/notifications/infrastructure/kafka/consumers/review.consumer';
import { startBookingKafkaConsumer } from '@modules/notifications/infrastructure/kafka/consumers/booking.consumer';
import { startBillingKafkaConsumer } from '@modules/notifications/infrastructure/kafka/consumers/billing.consumer';
import { startPropertyKafkaConsumer } from '@modules/notifications/infrastructure/kafka/consumers/property.consumer';
import { IOutboxRepository } from '@modules/notifications/application/abstractions/outbox/OutboxRepository.interface';
import { UoWInterface } from '@modules/notifications/application/abstractions/UoW.interface';
import { SingleRecipientHandler } from '@modules/notifications/application/handlers/incomingHandlers/SingleRecipient.handler';
import { DualRecipientHandler } from '@modules/notifications/application/handlers/incomingHandlers/DualRecipient.handler';
import { AccountCreatedHandler } from '@modules/notifications/application/handlers/incomingHandlers/AccountCreated.handler';
import { authEventNames } from '@modules/notifications/application/abstractions/incomingQueueTypes/auth.types';
import { userEventNames } from '@modules/notifications/application/abstractions/incomingQueueTypes/user.types';
import { importantEventNames } from '@modules/notifications/application/abstractions/incomingQueueTypes/important.types';
import { reviewEventNames } from '@modules/notifications/application/abstractions/incomingQueueTypes/review.types';
import { bookingEventNames } from '@modules/notifications/application/abstractions/incomingQueueTypes/booking.types';
import { billingEventNames } from '@modules/notifications/application/abstractions/incomingQueueTypes/billing.types';
import { propertyEventNames } from '@modules/notifications/application/abstractions/incomingQueueTypes/property.types';
import {
  ACCOUNT_CREATED_EVENT_TYPES,
  DUAL_RECIPIENT_EVENT_TYPES,
} from '@modules/notifications/application/abstractions/incomingQueueTypes/eventRecipientGroups';
import { startKafkaDlqProducer } from '@modules/notifications/infrastructure/kafka/producer/dlq.producer';

function toDispatcherHandler<T>(handler: IOutboxHandler<T>): Handler {
  return (event) =>
    handler.handle(event.eventId, event.type, event.payload as T);
}

function registerIncomingHandlers(
  dispatcher: EventDispatcher,
  outboxRepository: IOutboxRepository,
  uow: UoWInterface,
): void {
  const singleHandler = new SingleRecipientHandler(outboxRepository, uow);
  const dualHandler = new DualRecipientHandler(outboxRepository, uow);
  const accountCreatedHandler = new AccountCreatedHandler(
    outboxRepository,
    uow,
  );

  const single = toDispatcherHandler(singleHandler);
  const dual = toDispatcherHandler(dualHandler);
  const accountCreated = toDispatcherHandler(accountCreatedHandler);

  dispatcher.register(authEventNames.password_changed, single);

  dispatcher.register(userEventNames.able_to_leave_review, single);
  dispatcher.register(userEventNames.new_role_received, single);

  dispatcher.register(importantEventNames.chat_created, single);
  dispatcher.register(importantEventNames.forgot_password, single);
  dispatcher.register(importantEventNames.account_need_confirmation, single);

  dispatcher.register(reviewEventNames.new_review_received, single);
  dispatcher.register(reviewEventNames.new_review_created, single);
  dispatcher.register(reviewEventNames.review_edited, single);

  dispatcher.register(bookingEventNames.booking_paid, single);
  dispatcher.register(bookingEventNames.booking_expired, single);

  dispatcher.register(billingEventNames.billing_refund, single);

  dispatcher.register(propertyEventNames.property_created, single);
  dispatcher.register(propertyEventNames.property_changed, single);
  dispatcher.register(propertyEventNames.property_deleted, single);
  dispatcher.register(propertyEventNames.property_images_updated, single);
  dispatcher.register(propertyEventNames.property_images_added, single);
  dispatcher.register(propertyEventNames.property_images_deleted, single);

  for (const type of DUAL_RECIPIENT_EVENT_TYPES) {
    dispatcher.register(type, dual);
  }
  for (const type of ACCOUNT_CREATED_EVENT_TYPES) {
    dispatcher.register(type, accountCreated);
  }
}

export async function startKafkaConsumers(
  eventDispatcher: EventDispatcher,
  outboxRepository: IOutboxRepository,
  uow: UoWInterface,
): Promise<void> {
  registerIncomingHandlers(eventDispatcher, outboxRepository, uow);

  await startKafkaDlqProducer();

  const consumerStarters = [
    startAuthKafkaConsumer,
    startUserKafkaConsumer,
    startImportantKafkaConsumer,
    startReviewKafkaConsumer,
    startBookingKafkaConsumer,
    startBillingKafkaConsumer,
    startPropertyKafkaConsumer,
  ];

  for (const start of consumerStarters) {
    await start(eventDispatcher);
  }
}
