import {
  KAFKA_AUTH_TOPIC,
  KAFKA_AUTH_GROUP_ID,
} from '@/common/consts/infrastucture.consts';
import { EventDispatcher } from '@modules/notifications/infrastructure/kafka/dispatchers/event.dispatcher';
import { createKafkaConsumer } from './createConsumer';

export async function startAuthKafkaConsumer(
  dispatcher: EventDispatcher,
): Promise<void> {
  await createKafkaConsumer({
    topic: KAFKA_AUTH_TOPIC,
    groupId: KAFKA_AUTH_GROUP_ID,
    dispatcher,
  });
}
