import type { Request, Response } from 'express';
import {
  calendarQuerySchema,
  changeStatusSchema,
  createAppointmentSchema,
  listAppointmentsQuerySchema,
} from '../dtos/appointment.dto';
import { requireUser } from '../middlewares/auth.middleware';
import type { AppointmentService } from '../services/appointment.service';
import type { CalendarService } from '../services/calendar.service';
import { parseId } from '../shared/params';
import { parseInput } from '../shared/validation';

export class AppointmentController {
  constructor(
    private readonly appointments: AppointmentService,
    private readonly calendar: CalendarService,
  ) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const input = parseInput(createAppointmentSchema, req.body);
    res.status(201).json(await this.appointments.create(input));
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const query = parseInput(listAppointmentsQuerySchema, req.query);
    res.status(200).json(await this.appointments.list(requireUser(req), query));
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    res.status(200).json(await this.appointments.getById(requireUser(req), parseId(req.params.id)));
  };

  changeStatus = async (req: Request, res: Response): Promise<void> => {
    const id = parseId(req.params.id);
    const { status } = parseInput(changeStatusSchema, req.body);
    res.status(200).json(await this.appointments.changeStatus(requireUser(req), id, status));
  };

  getCalendar = async (req: Request, res: Response): Promise<void> => {
    const doctorId = parseId(req.params.doctorId, 'doctorId');
    const query = parseInput(calendarQuerySchema, req.query);
    res.status(200).json(await this.calendar.get(doctorId, query));
  };
}
