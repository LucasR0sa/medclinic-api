import type { Request, Response } from 'express';
import { createMedicalRecordSchema } from '../dtos/medical-record.dto';
import { requireUser } from '../middlewares/auth.middleware';
import type { MedicalRecordService } from '../services/medical-record.service';
import { paginationSchema } from '../shared/pagination';
import { parseId } from '../shared/params';
import { parseInput } from '../shared/validation';

export class MedicalRecordController {
  constructor(private readonly records: MedicalRecordService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const patientId = parseId(req.params.patientId, 'patientId');
    const input = parseInput(createMedicalRecordSchema, req.body);
    res.status(201).json(await this.records.create(requireUser(req), patientId, input));
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const patientId = parseId(req.params.patientId, 'patientId');
    const pagination = parseInput(paginationSchema, req.query);
    res.status(200).json(await this.records.list(requireUser(req), patientId, pagination));
  };
}
