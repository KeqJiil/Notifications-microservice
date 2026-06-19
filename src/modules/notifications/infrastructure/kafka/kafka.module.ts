import { EventDispatcher } from '@modules/notifications/infrastructure/kafka/dispatchers/event.dispatcher';
import { startAuthKafkaConsumer } from '@modules/notifications/infrastructure/kafka/consumers/auth.consumer';
import { startUserKafkaConsumer } from '@modules/notifications/infrastructure/kafka/consumers/user.consumer';
import { startImportantKafkaConsumer } from '@modules/notifications/infrastructure/kafka/consumers/important.consumer';
import { startReviewKafkaConsumer } from '@modules/notifications/infrastructure/kafka/consumers/review.consumer';
import { startBookingKafkaConsumer } from '@modules/notifications/infrastructure/kafka/consumers/booking.consumer';
import { startBillingKafkaConsumer } from '@modules/notifications/infrastructure/kafka/consumers/billing.consumer';
import { startPropertyKafkaConsumer } from '@modules/notifications/infrastructure/kafka/consumers/property.consumer';

export async function startKafkaConsumers(eventDispatcher: EventDispatcher): Promise<void> {
  await Promise.all([
    startAuthKafkaConsumer(eventDispatcher),
    startUserKafkaConsumer(eventDispatcher),
    startImportantKafkaConsumer(eventDispatcher),
    startReviewKafkaConsumer(eventDispatcher),
    startBookingKafkaConsumer(eventDispatcher),
    startBillingKafkaConsumer(eventDispatcher),
    startPropertyKafkaConsumer(eventDispatcher),
  ]);
}
