import {
  KAFKA_IMPORTANT_TOPIC,
  KAFKA_IMPORTANT_GROUP_ID,
} from '@/common/consts/infrastucture.consts';
import { EventDispatcher } from '@modules/notifications/infrastructure/kafka/dispatchers/event.dispatcher';
import { createKafkaConsumer } from './createConsumer';

export async function startImportantKafkaConsumer(
  dispatcher: EventDispatcher,
): Promise<void> {
  await createKafkaConsumer({
    topic: KAFKA_IMPORTANT_TOPIC,
    groupId: KAFKA_IMPORTANT_GROUP_ID,
    dispatcher,
  });
}
