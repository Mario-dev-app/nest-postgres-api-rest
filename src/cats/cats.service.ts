import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { CreateCatDto } from './dto/create-cat.dto';
import { UpdateCatDto } from './dto/update-cat.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Cat } from './entities/cat.entity';
import { Repository } from 'typeorm';
import { Breed } from '../breeds/entities/breed.entity';
import { UserActiveInterface } from '../common/interfaces/user-active.interface';
import { Role } from '../common/enums/rol.enum';

@Injectable()
export class CatsService {

  constructor(
    @InjectRepository(Cat)
    private readonly catsRepository: Repository<Cat>,
    @InjectRepository(Breed)
    private readonly breedsRepository: Repository<Breed>
  ) { }

  async create(createCatDto: CreateCatDto, email: string) {
    const breed = await this.validateBreed(createCatDto.breed);

    return await this.catsRepository.save({
      ...createCatDto,
      breed,
      userEmail: email
    });
  }

  async findAll(user: UserActiveInterface) {
    if (user.role === Role.ADMIN) {
      return await this.catsRepository.find();
    } else {
      return await this.catsRepository.find({
        where: { userEmail: user.email }
      });
    }
  }

  async findOne(id: number, user: UserActiveInterface) {
    const cat = await this.catsRepository.findOneBy({ id });

    if (!cat) {
      throw new BadRequestException('Cat not found');
    }

    this.validateOwnerShip(cat, user);

    return cat;
  }

  async update(id: number, updateCatDto: UpdateCatDto, user: UserActiveInterface) {
    await this.findOne(id, user);
    const breed = await this.validateBreed(updateCatDto.breed);

    return await this.catsRepository.update(id, { name: updateCatDto.name, age: updateCatDto.age, breed: breed });
  }

  async remove(id: number, user: UserActiveInterface) {
    await this.findOne(id, user);
    return await this.catsRepository.softDelete(id);
  }

  private validateOwnerShip(cat: Cat, user: UserActiveInterface) {
    if (user.role !== Role.ADMIN && cat.userEmail !== user.email) {
      throw new UnauthorizedException();
    }
  }

  private async validateBreed(breed: string) {
    const breedEntity = await this.breedsRepository.findOneBy({ name: breed });

    if (!breedEntity) {
      throw new BadRequestException('Breed not found');
    }

    return breedEntity;
  }
}
