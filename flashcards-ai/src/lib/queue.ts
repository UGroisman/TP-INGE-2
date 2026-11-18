import "server-only";
import amqp from "amqplib";

export async function enqueueMaterial(jobId: string) {
  const connection = await amqp.connect(process.env.RABBITMQ_URL ?? "amqp://localhost:5672");
  try {
    const channel = await connection.createConfirmChannel();
    await channel.assertQueue("material-processing", { durable: true });
    channel.sendToQueue("material-processing", Buffer.from(JSON.stringify({ jobId })), { persistent: true, contentType: "application/json" });
    await channel.waitForConfirms();
    await channel.close();
  } finally { await connection.close(); }
}
