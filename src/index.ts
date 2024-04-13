import { Client, GatewayIntentBits } from 'discord.js';
import { token } from './module/core/config.json';
import { Logger } from './module/shared/classes/logger';
import { basename } from 'node:path';

const logger: Logger = new Logger(basename(__filename));

logger.info('🤖 Bot is starting...');

const client: Client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// Register handlers
require('./module/feature/handlers/handlers.handler.ts')(client);

client.login(token).then((value: string): void => {
    if (value) {
        logger.info('The bot is ready to kick some ass');
    } else {
        logger.error('Failed to connect');
    }
});

/**
 * Code to tracked API Errors
 * @see https://discordjs.guide/popular-topics/errors.html#how-to-diagnose-api-errors
 */
process.on('unhandledRejection', error => {
    logger.error(`Unhandled promise rejection`, error);
});

/**
 * Event handler for uncaught exceptions in the Node.js process.
 *
 * @param {Error} err - The uncaught exception error object.
 */
process.on('uncaughtException', (err: Error): void => {
    logger.error(`${err}`, err);
});
