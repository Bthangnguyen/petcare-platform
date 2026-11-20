import type { Db } from '../../db/database';

export type PetStatus = 'ACTIVE' | 'ARCHIVED';

export interface Pet {
  id: string;
  ownerId: string;
  name: string;
  species: string;
  breed: string;
  sex: string;
  birthDate: string | null;
  microchipNumber: string | null;
  allergies: string[];
  qrCode: string;
  status: PetStatus;
  createdAt: string;
}
export interface WeightRecord {
  id: string;
  petId: string;
  weightKg: number;
  recordedAt: string;
}
export interface VaccinationRecord {
  id: string;
  petId: string;
  vaccineName: string;
  injectionDate: string;
  revaccinationDate: string | null;
  source: 'MANUAL' | 'SERVICE_RESULT' | 'AI_EXTRACTED';
}

const mapPet = (r: any): Pet => ({
  id: r.id,
  ownerId: r.owner_id,
  name: r.name,
  species: r.species,
  breed: r.breed,
  sex: r.sex,
  birthDate: r.birth_date,
  microchipNumber: r.microchip_number,
  allergies: JSON.parse(r.allergies),
  qrCode: r.qr_code,
  status: r.status,
  createdAt: r.created_at,
});

/** Persists Pet, WeightRecord and VaccinationRecord. */
export class PetRepository {
  constructor(private readonly db: Db) {}

  findPetById(id: string): Pet | undefined {
    const r = this.db.prepare('SELECT * FROM pets WHERE id = ?').get(id);
    return r ? mapPet(r) : undefined;
  }

  findPetsByOwner(ownerId: string, includeArchived: boolean): Pet[] {
    const sql = `SELECT * FROM pets WHERE owner_id = ? ${includeArchived ? '' : "AND status = 'ACTIVE'"} ORDER BY created_at, name`;
    return this.db.prepare(sql).all(ownerId).map(mapPet);
  }

  findPetByMicrochip(number: string): Pet | undefined {
    const r = this.db.prepare('SELECT * FROM pets WHERE microchip_number = ?').get(number);
    return r ? mapPet(r) : undefined;
  }

  insertPet(p: Pet): void {
    this.db
      .prepare(
        `INSERT INTO pets (id, owner_id, name, species, breed, sex, birth_date, microchip_number, allergies, qr_code, status, created_at)
         VALUES (@id, @ownerId, @name, @species, @breed, @sex, @birthDate, @microchipNumber, @allergies, @qrCode, @status, @createdAt)`,
      )
      .run({ ...p, allergies: JSON.stringify(p.allergies) });
  }

  updatePet(p: Pet): void {
    this.db
      .prepare(
        `UPDATE pets SET name=@name, species=@species, breed=@breed, sex=@sex, birth_date=@birthDate,
           microchip_number=@microchipNumber, allergies=@allergies, status=@status WHERE id=@id`,
      )
      .run({ ...p, allergies: JSON.stringify(p.allergies) });
  }

  insertWeight(w: WeightRecord): void {
    this.db.prepare('INSERT INTO weight_records (id, pet_id, weight_kg, recorded_at) VALUES (?, ?, ?, ?)').run(w.id, w.petId, w.weightKg, w.recordedAt);
  }

  findWeights(petId: string): WeightRecord[] {
    return this.db
      .prepare('SELECT * FROM weight_records WHERE pet_id = ? ORDER BY recorded_at, rowid')
      .all(petId)
      .map((r: any) => ({ id: r.id, petId: r.pet_id, weightKg: r.weight_kg, recordedAt: r.recorded_at }));
  }

  insertVaccination(v: VaccinationRecord): void {
    this.db
      .prepare('INSERT INTO vaccination_records (id, pet_id, vaccine_name, injection_date, revaccination_date, source) VALUES (?, ?, ?, ?, ?, ?)')
      .run(v.id, v.petId, v.vaccineName, v.injectionDate, v.revaccinationDate, v.source);
  }

  findVaccinations(petId: string): VaccinationRecord[] {
    return this.db
      .prepare('SELECT * FROM vaccination_records WHERE pet_id = ? ORDER BY injection_date, rowid')
      .all(petId)
      .map((r: any) => ({
        id: r.id,
        petId: r.pet_id,
        vaccineName: r.vaccine_name,
        injectionDate: r.injection_date,
        revaccinationDate: r.revaccination_date,
        source: r.source,
      }));
  }
}
