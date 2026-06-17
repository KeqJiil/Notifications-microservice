import {
  KAFKA_PROPERTY_TOPIC,
  KAFKA_PROPERTY_GROUP_ID,
} from '@/common/consts/infrastucture.consts';
import { EventDispatcher } from '@modules/notifications/infrastructure/kafka/dispatchers/event.dispatcher';
import { createKafkaConsumer } from './createConsumer';

export async function startPropertyKafkaConsumer(
  dispatcher: EventDispatcher,
): Promise<void> {
  await createKafkaConsumer({
    topic: KAFKA_PROPERTY_TOPIC,
    groupId: KAFKA_PROPERTY_GROUP_ID,
    dispatcher,
  });
}
