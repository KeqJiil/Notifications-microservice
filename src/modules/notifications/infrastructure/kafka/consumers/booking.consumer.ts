import {
  KAFKA_BOOKINGS_TOPIC,
  KAFKA_BOOKINGS_GROUP_ID,
} from '@/common/consts/infrastucture.consts';
import { EventDispatcher } from '@modules/notifications/infrastructure/kafka/dispatchers/event.dispatcher';
import { createKafkaConsumer } from './createConsumer';

export async function startBookingKafkaConsumer(
  dispatcher: EventDispatcher,
): Promise<void> {
  await createKafkaConsumer({
    topic: KAFKA_BOOKINGS_TOPIC,
    groupId: KAFKA_BOOKINGS_GROUP_ID,
    dispatcher,
  });
}
