import { TableAbstract } from '../../../abstracts/table.abstract';
import { SelectBuilder } from '../../../builders/query/select.builder';
import { LoggerInjector } from '../../../decorators/injector/logger-injector.decorator';
import type { CronName } from './models/crons.type';

/**
 * Decorator to inject logging functionality.
 */
@LoggerInjector
export class CronsTable extends TableAbstract {
    constructor() {
        super('crons');
    }

    /**
     * Retrieves the cron expression for the specified cron job name.
     *
     * @param {CronName} name - The name of the cron job.
     *
     * @returns {Promise<string>} A promise that resolves to the cron expression associated with the given name.
     */
    public async getCron(name: CronName): Promise<string> {
        return ((await this.select(new SelectBuilder(this).columns('cron').where([`name LIKE '${name}'`]))) as any)[0].cron;
    }
}
