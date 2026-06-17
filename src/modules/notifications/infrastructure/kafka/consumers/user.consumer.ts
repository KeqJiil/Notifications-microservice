import {
  KAFKA_USER_TOPIC,
  KAFKA_USER_GROUP_ID,
} from '@/common/consts/infrastucture.consts';
import { EventDispatcher } from '@modules/notifications/infrastructure/kafka/dispatchers/event.dispatcher';
import { createKafkaConsumer } from './createConsumer';

export async function startUserKafkaConsumer(
  dispatcher: EventDispatcher,
): Promise<void> {
  await createKafkaConsumer({
    topic: KAFKA_USER_TOPIC,
    groupId: KAFKA_USER_GROUP_ID,
    dispatcher,
  });
}
