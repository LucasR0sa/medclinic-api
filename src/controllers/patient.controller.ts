import type { Request, Response } from 'express';
import {
  createPatientSchema,
  listPatientsQuerySchema,
  updatePatientSchema,
} from '../dtos/patient.dto';
import type { PatientService } from '../services/patient.service';
import { parseId } from '../shared/params';
import { parseInput } from '../shared/validation';

export class PatientController {
  constructor(private readonly patients: PatientService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const input = parseInput(createPatientSchema, req.body);
    res.status(201).json(await this.patients.create(input));
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const query = parseInput(listPatientsQuerySchema, req.query);
    res.status(200).json(await this.patients.list(query));
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    res.status(200).json(await this.patients.getById(parseId(req.params.id)));
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const id = parseId(req.params.id);
    const input = parseInput(updatePatientSchema, req.body);
    res.status(200).json(await this.patients.update(id, input));
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    await this.patients.remove(parseId(req.params.id));
    res.status(204).end();
  };
}
