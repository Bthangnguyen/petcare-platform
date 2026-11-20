import crypto from 'node:crypto';
import { z } from 'zod';
import { badRequest, conflict, notFound } from '../../common/errors';
import { Clock, isIsoDate, localDate } from '../../common/time';
import { Pet, PetRepository, VaccinationRecord, WeightRecord } from './pet.repository';
import { QrCodeGenerator } from './qrCodeGenerator';

const dateField = (label: string) =>
  z
    .string()
    .refine((s) => isIsoDate(s), `${label} không hợp lệ.`);

export const petSchema = z.object({
  name: z.string().trim().min(1, 'Vui lòng nhập tên thú cưng.').max(60),
  species: z.string().trim().min(1, 'Vui lòng chọn loài.').max(30),
  breed: z.string().trim().max(60).optional().default(''),
  sex: z.enum(['Đực', 'Cái', '']).optional().default(''),
  birthDate: dateField('Ngày sinh').nullable().optional(),
  microchipNumber: z
    .string()
    .trim()
    .regex(/^\d{15}$/, 'Số microchip gồm 15 chữ số.')
    .or(z.literal(''))
    .nullable()
    .optional(),
  allergies: z.array(z.string().trim().min(1).max(60)).max(20).optional().default([]),
});
export type PetInput = z.infer<typeof petSchema>;

export const weightSchema = z.object({
  weightKg: z.number({ invalid_type_error: 'Cân nặng phải là số.' }).positive('Cân nặng phải lớn hơn 0.').max(200, 'Cân nặng không hợp lệ.'),
  recordedAt: dateField('Ngày cân'),
});
export const vaccinationSchema = z.object({
  vaccineName: z.string().trim().min(1, 'Vui lòng nhập tên vắc-xin.').max(80),
  injectionDate: dateField('Ngày tiêm'),
  revaccinationDate: dateField('Ngày tiêm nhắc').nullable().optional(),
});

/** Rules for pet profiles, health history and access (UC03, UC04). Pet data is private to its owner. */
export class PetProfileService {
  constructor(
    private readonly pets: PetRepository,
    private readonly qr: QrCodeGenerator,
    private readonly clock: Clock,
  ) {}

  private today(): string {
    return localDate(this.clock.now());
  }

  /** Returns the pet if it belongs to the actor; otherwise "not found" (the existence of other pets is not revealed). */
  private ownedPet(ownerId: string, petId: string): Pet {
    const pet = this.pets.findPetById(petId);
    if (!pet || pet.ownerId !== ownerId) throw notFound('Không tìm thấy hồ sơ thú cưng.');
    return pet;
  }

  private checkRules(input: PetInput, exceptPetId?: string): void {
    const fields: Record<string, string> = {};
    if (input.birthDate && input.birthDate > this.today()) fields.birthDate = 'Ngày sinh không được ở tương lai.';
    if (input.microchipNumber) {
      const other = this.pets.findPetByMicrochip(input.microchipNumber);
      if (other && other.id !== exceptPetId) fields.microchipNumber = 'Số microchip này đã được dùng cho một thú cưng khác.';
    }
    if (Object.keys(fields).length) throw badRequest('Dữ liệu chưa hợp lệ. Vui lòng kiểm tra các trường được đánh dấu.', fields);
  }

  createPet(ownerId: string, input: PetInput): Pet {
    this.checkRules(input);
    const pet: Pet = {
      id: crypto.randomUUID(),
      ownerId,
      name: input.name,
      species: input.species,
      breed: input.breed ?? '',
      sex: input.sex ?? '',
      birthDate: input.birthDate ?? null,
      microchipNumber: input.microchipNumber || null,
      allergies: input.allergies ?? [],
      qrCode: this.qr.generate(),
      status: 'ACTIVE',
      createdAt: this.clock.now().toISOString(),
    };
    this.pets.insertPet(pet);
    return pet;
  }

  updatePet(ownerId: string, petId: string, input: PetInput): Pet {
    const pet = this.ownedPet(ownerId, petId);
    this.checkRules(input, pet.id);
    const updated: Pet = {
      ...pet,
      name: input.name,
      species: input.species,
      breed: input.breed ?? '',
      sex: input.sex ?? '',
      birthDate: input.birthDate ?? null,
      microchipNumber: input.microchipNumber || null,
      allergies: input.allergies ?? [],
    };
    this.pets.updatePet(updated);
    return updated;
  }

  /** UC03, A4: the profile is archived; the history is kept and the pet is hidden from the booking forms. */
  archivePet(ownerId: string, petId: string): Pet {
    const pet = this.ownedPet(ownerId, petId);
    const archived: Pet = { ...pet, status: 'ARCHIVED' };
    this.pets.updatePet(archived);
    return archived;
  }

  listPets(ownerId: string, includeArchived = false): Pet[] {
    return this.pets.findPetsByOwner(ownerId, includeArchived);
  }

  getPet(ownerId: string, petId: string) {
    const pet = this.ownedPet(ownerId, petId);
    return { pet, weights: this.pets.findWeights(pet.id), vaccinations: this.pets.findVaccinations(pet.id) };
  }

  addWeightRecord(ownerId: string, petId: string, weightKg: number, recordedAt: string): WeightRecord {
    const pet = this.ownedPet(ownerId, petId);
    if (recordedAt > this.today()) throw badRequest('Dữ liệu chưa hợp lệ.', { recordedAt: 'Ngày cân không được ở tương lai.' });
    const record: WeightRecord = { id: crypto.randomUUID(), petId: pet.id, weightKg, recordedAt };
    this.pets.insertWeight(record);
    return record;
  }

  addVaccinationRecord(ownerId: string, petId: string, input: z.infer<typeof vaccinationSchema>): VaccinationRecord {
    const pet = this.ownedPet(ownerId, petId);
    const fields: Record<string, string> = {};
    if (input.injectionDate > this.today()) fields.injectionDate = 'Ngày tiêm không được ở tương lai.';
    if (input.revaccinationDate && input.revaccinationDate < input.injectionDate) fields.revaccinationDate = 'Ngày tiêm nhắc phải sau ngày tiêm.';
    if (Object.keys(fields).length) throw badRequest('Dữ liệu chưa hợp lệ.', fields);
    const record: VaccinationRecord = {
      id: crypto.randomUUID(),
      petId: pet.id,
      vaccineName: input.vaccineName,
      injectionDate: input.injectionDate,
      revaccinationDate: input.revaccinationDate ?? null,
      source: 'MANUAL',
    };
    this.pets.insertVaccination(record);
    return record;
  }

  async getQrCode(ownerId: string, petId: string): Promise<string> {
    const pet = this.ownedPet(ownerId, petId);
    return this.qr.toDataUrl(pet.qrCode);
  }

  /** Port used by Booking & Availability: the active pet of an owner (UC07, A3). */
  getActivePetOf(ownerId: string, petId: string): Pet {
    const pet = this.ownedPet(ownerId, petId);
    if (pet.status !== 'ACTIVE') throw conflict('PET_ARCHIVED', 'Hồ sơ thú cưng này đã được lưu trữ.');
    return pet;
  }

  getAllergies(petId: string): string[] {
    return this.pets.findPetById(petId)?.allergies ?? [];
  }

  /** Small summary of a pet for other modules (PetReadPort): name and allergies, for example for the facility (UC11 step 3). */
  getSummary(petId: string): { id: string; name: string; allergies: string[] } {
    const pet = this.pets.findPetById(petId);
    return { id: petId, name: pet?.name ?? '', allergies: pet?.allergies ?? [] };
  }
}
