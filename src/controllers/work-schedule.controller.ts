import type { Request, Response } from 'express';
import { workScheduleSchema } from '../dtos/work-schedule.dto';
import type { WorkScheduleService } from '../services/work-schedule.service';
import { parseId } from '../shared/params';
import { parseInput } from '../shared/validation';

export class WorkScheduleController {
  constructor(private readonly schedules: WorkScheduleService) {}

  replace = async (req: Request, res: Response): Promise<void> => {
    const doctorId = parseId(req.params.doctorId, 'doctorId');
    const input = parseInput(workScheduleSchema, req.body);
    res.status(200).json(await this.schedules.replace(doctorId, input));
  };

  get = async (req: Request, res: Response): Promise<void> => {
    res.status(200).json(await this.schedules.get(parseId(req.params.doctorId, 'doctorId')));
  };
}
