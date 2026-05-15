const amqp = require('amqplib');

async function start() {
    const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://lokalni-streznik');
    const channel = await connection.createChannel();
    
    const queue = 'tasks';
    await channel.assertQueue(queue, { durable: true });
    
    process.stdout.write('Worker started, waiting for messages...\n');
    
    channel.consume(queue, (msg) => {
        if (msg !== null) {
            const content = msg.content.toString();
            process.stdout.write('Received: ' + content + '\n');
            // Process message here
            channel.ack(msg);
        }
    });
}

start().catch(err => process.stderr.write(String(err) + '\n'));
