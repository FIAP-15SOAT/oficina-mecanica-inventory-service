import { Service } from '@domain/entities/service.entity';
import { DomainValidationException } from '@domain/exceptions/domain-validation.exception';

describe('Service Entity', () => {
  const validProps = {
    name: 'Troca de óleo',
    description: 'Troca de óleo do motor com filtro',
    basePrice: 150.0,
    estimatedTimeMin: 30,
  };

  describe('create (factory method)', () => {
    describe('when valid', () => {
      it('should create a valid service with defaults', () => {
        const service = Service.create(validProps);

        expect(service.name).toBe('Troca de óleo');
        expect(service.description).toBe('Troca de óleo do motor com filtro');
        expect(service.basePrice).toBe(150.0);
        expect(service.estimatedTimeMin).toBe(30);
      });

      it('should trim the name', () => {
        const service = Service.create({ ...validProps, name: '  Troca de óleo  ' });

        expect(service.name).toBe('Troca de óleo');
      });

      it('should trim the description', () => {
        const service = Service.create({
          ...validProps,
          description: '  Troca de óleo do motor  ',
        });

        expect(service.description).toBe('Troca de óleo do motor');
      });

      it('should accept null description', () => {
        const service = Service.create({ ...validProps, description: null });

        expect(service.description).toBeNull();
      });

      it('should accept undefined description and convert to null', () => {
        const service = Service.create({ ...validProps, description: undefined });

        expect(service.description).toBeNull();
      });
    });

    describe('name validation', () => {
      it('should throw error if name is empty', () => {
        expect(() => Service.create({ ...validProps, name: '' })).toThrow(
          DomainValidationException,
        );
        expect(() => Service.create({ ...validProps, name: '' })).toThrow('Nome é obrigatório');
      });

      it('should throw error if name is too short', () => {
        expect(() => Service.create({ ...validProps, name: 'Ab' })).toThrow(
          DomainValidationException,
        );
        expect(() => Service.create({ ...validProps, name: 'Ab' })).toThrow(
          'Nome deve ter no mínimo 3 caracteres',
        );
      });

      it('should throw error if name is too long', () => {
        const longName = 'A'.repeat(151);

        expect(() => Service.create({ ...validProps, name: longName })).toThrow(
          DomainValidationException,
        );
        expect(() => Service.create({ ...validProps, name: longName })).toThrow(
          'Nome deve ter no máximo 150 caracteres',
        );
      });
    });

    describe('description validation', () => {
      it('should throw error if description is too long', () => {
        const longDescription = 'A'.repeat(501);

        expect(() => Service.create({ ...validProps, description: longDescription })).toThrow(
          DomainValidationException,
        );
        expect(() => Service.create({ ...validProps, description: longDescription })).toThrow(
          'Descrição deve ter no máximo 500 caracteres',
        );
      });
    });

    describe('base price validation', () => {
      it('should throw error if base price is not finite', () => {
        expect(() => Service.create({ ...validProps, basePrice: NaN })).toThrow(
          DomainValidationException,
        );
        expect(() => Service.create({ ...validProps, basePrice: NaN })).toThrow(
          'Preço base inválido',
        );
      });

      it('should throw error if base price is infinite', () => {
        expect(() => Service.create({ ...validProps, basePrice: Infinity })).toThrow(
          DomainValidationException,
        );
        expect(() => Service.create({ ...validProps, basePrice: Infinity })).toThrow(
          'Preço base inválido',
        );
      });

      it('should throw error if base price is zero', () => {
        expect(() => Service.create({ ...validProps, basePrice: 0 })).toThrow(
          DomainValidationException,
        );
        expect(() => Service.create({ ...validProps, basePrice: 0 })).toThrow(
          'Preço base deve ser maior que zero',
        );
      });

      it('should throw error if base price is negative', () => {
        expect(() => Service.create({ ...validProps, basePrice: -10 })).toThrow(
          DomainValidationException,
        );
        expect(() => Service.create({ ...validProps, basePrice: -10 })).toThrow(
          'Preço base deve ser maior que zero',
        );
      });
    });

    describe('estimated time validation', () => {
      it('should throw error if estimated time is not an integer', () => {
        expect(() => Service.create({ ...validProps, estimatedTimeMin: 30.5 })).toThrow(
          DomainValidationException,
        );
        expect(() => Service.create({ ...validProps, estimatedTimeMin: 30.5 })).toThrow(
          'Tempo estimado deve ser um número inteiro',
        );
      });

      it('should throw error if estimated time is zero', () => {
        expect(() => Service.create({ ...validProps, estimatedTimeMin: 0 })).toThrow(
          DomainValidationException,
        );
        expect(() => Service.create({ ...validProps, estimatedTimeMin: 0 })).toThrow(
          'Tempo estimado deve ser maior que zero',
        );
      });

      it('should throw error if estimated time is negative', () => {
        expect(() => Service.create({ ...validProps, estimatedTimeMin: -10 })).toThrow(
          DomainValidationException,
        );
        expect(() => Service.create({ ...validProps, estimatedTimeMin: -10 })).toThrow(
          'Tempo estimado deve ser maior que zero',
        );
      });
    });
  });

  describe('reconstitute()', () => {
    it('should rebuild a service from persisted props', () => {
      const now = new Date();
      const service = Service.reconstitute({
        id: 'svc-1',
        ...validProps,
        createdAt: now,
        updatedAt: now,
      });

      expect(service.id).toBe('svc-1');
      expect(service.name).toBe(validProps.name);
    });
  });

  describe('update()', () => {
    it('should update fields and trim strings', () => {
      const service = Service.create(validProps);

      service.update({
        name: '  Alinhamento  ',
        description: '  Alinhamento 3D ',
        basePrice: 90,
        estimatedTimeMin: 45,
      });

      expect(service.name).toBe('Alinhamento');
      expect(service.description).toBe('Alinhamento 3D');
      expect(service.basePrice).toBe(90);
      expect(service.estimatedTimeMin).toBe(45);
    });

    it('should set description to null when omitted', () => {
      const service = Service.create(validProps);

      service.update({ name: 'Alinhamento', basePrice: 90, estimatedTimeMin: 45 });

      expect(service.description).toBeNull();
    });

    it('should throw on invalid props', () => {
      const service = Service.create(validProps);

      expect(() => service.update({ ...validProps, name: '' })).toThrow(DomainValidationException);
    });
  });
});
