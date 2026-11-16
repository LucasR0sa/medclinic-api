import type { Request, Response } from 'express';
import { createDoctorSchema, listDoctorsQuerySchema } from '../dtos/doctor.dto';
import type { DoctorService } from '../services/doctor.service';
import { parseId } from '../shared/params';
import { parseInput } from '../shared/validation';

export class DoctorController {
  constructor(private readonly doctors: DoctorService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const input = parseInput(createDoctorSchema, req.body);
    res.status(201).json(await this.doctors.create(input));
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const query = parseInput(listDoctorsQuerySchema, req.query);
    res.status(200).json(await this.doctors.list(query));
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    res.status(200).json(await this.doctors.getById(parseId(req.params.id)));
  };
}
