import {
  KAFKA_BILLING_TOPIC,
  KAFKA_BILLING_GROUP_ID,
} from '@/common/consts/infrastucture.consts';
import { EventDispatcher } from '@modules/notifications/infrastructure/kafka/dispatchers/event.dispatcher';
import { createKafkaConsumer } from './createConsumer';

export async function startBillingKafkaConsumer(
  dispatcher: EventDispatcher,
): Promise<void> {
  await createKafkaConsumer({
    topic: KAFKA_BILLING_TOPIC,
    groupId: KAFKA_BILLING_GROUP_ID,
    dispatcher,
  });
}
