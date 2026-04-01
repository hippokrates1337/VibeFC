import { MMYYYYUtilsService } from '../calculation-engine/mmyyyy-utils';

describe('MMYYYYUtilsService', () => {
  let service: MMYYYYUtilsService;

  beforeEach(() => {
    service = new MMYYYYUtilsService();
  });

  describe('isValidMMYYYY', () => {
    it('should validate correct MM-YYYY format', () => {
      expect(service.isValidMMYYYY('01-2023')).toBe(true);
      expect(service.isValidMMYYYY('12-2024')).toBe(true);
      expect(service.isValidMMYYYY('06-2025')).toBe(true);
    });

    it('should reject invalid MM-YYYY format', () => {
      expect(service.isValidMMYYYY('1-2023')).toBe(false); // Single digit month
      expect(service.isValidMMYYYY('13-2023')).toBe(false); // Invalid month
      expect(service.isValidMMYYYY('00-2023')).toBe(false); // Invalid month
      expect(service.isValidMMYYYY('01-23')).toBe(false); // Two digit year
      expect(service.isValidMMYYYY('2023-01')).toBe(false); // Reversed format
      expect(service.isValidMMYYYY('01/2023')).toBe(false); // Wrong separator
      expect(service.isValidMMYYYY('01-2023-01')).toBe(false); // Too many parts
      expect(service.isValidMMYYYY('')).toBe(false); // Empty string
      expect(service.isValidMMYYYY('invalid')).toBe(false); // Invalid string
    });
  });

  describe('addMonths', () => {
    it('should add months within the same year', () => {
      expect(service.addMonths('01-2023', 3)).toBe('04-2023');
      expect(service.addMonths('06-2023', 2)).toBe('08-2023');
    });

    it('should add months across year boundaries', () => {
      expect(service.addMonths('10-2023', 4)).toBe('02-2024');
      expect(service.addMonths('11-2023', 2)).toBe('01-2024');
      expect(service.addMonths('12-2023', 1)).toBe('01-2024');
    });

    it('should handle adding zero months', () => {
      expect(service.addMonths('06-2023', 0)).toBe('06-2023');
    });

    it('should handle adding negative months', () => {
      expect(service.addMonths('06-2023', -3)).toBe('03-2023');
      expect(service.addMonths('02-2023', -3)).toBe('11-2022');
    });

    it('should throw error for invalid input format', () => {
      expect(() => service.addMonths('invalid', 1)).toThrow('Invalid MM-YYYY format: invalid');
      expect(() => service.addMonths('13-2023', 1)).toThrow('Invalid MM-YYYY format: 13-2023');
    });
  });

  describe('subtractMonths', () => {
    it('should subtract months within the same year', () => {
      expect(service.subtractMonths('06-2023', 3)).toBe('03-2023');
      expect(service.subtractMonths('12-2023', 5)).toBe('07-2023');
    });

    it('should subtract months across year boundaries', () => {
      expect(service.subtractMonths('03-2023', 5)).toBe('10-2022');
      expect(service.subtractMonths('01-2023', 1)).toBe('12-2022');
    });

    it('should handle subtracting zero months', () => {
      expect(service.subtractMonths('06-2023', 0)).toBe('06-2023');
    });

    it('should handle negative subtraction (equivalent to addition)', () => {
      expect(service.subtractMonths('06-2023', -3)).toBe('09-2023');
    });
  });

  describe('compareMonths', () => {
    it('should compare months correctly', () => {
      expect(service.compareMonths('01-2023', '01-2023')).toBe(0); // Equal
      expect(service.compareMonths('01-2023', '02-2023')).toBe(-1); // Earlier
      expect(service.compareMonths('02-2023', '01-2023')).toBe(1); // Later
    });

    it('should compare across years correctly', () => {
      expect(service.compareMonths('12-2022', '01-2023')).toBe(-1); // Earlier year
      expect(service.compareMonths('01-2024', '12-2023')).toBe(1); // Later year
      expect(service.compareMonths('06-2023', '06-2023')).toBe(0); // Same month and year
    });

    it('should throw error for invalid formats', () => {
      expect(() => service.compareMonths('invalid', '01-2023')).toThrow('Invalid MM-YYYY format: invalid or 01-2023');
      expect(() => service.compareMonths('01-2023', 'invalid')).toThrow('Invalid MM-YYYY format: 01-2023 or invalid');
    });
  });

  describe('getMonthsBetween', () => {
    it('should get months within the same year', () => {
      const months = service.getMonthsBetween('01-2023', '03-2023');
      expect(months).toEqual(['01-2023', '02-2023', '03-2023']);
    });

    it('should get months across year boundaries', () => {
      const months = service.getMonthsBetween('11-2022', '02-2023');
      expect(months).toEqual(['11-2022', '12-2022', '01-2023', '02-2023']);
    });

    it('should handle single month range', () => {
      const months = service.getMonthsBetween('06-2023', '06-2023');
      expect(months).toEqual(['06-2023']);
    });

    it('should handle empty range when start > end', () => {
      const months = service.getMonthsBetween('03-2023', '01-2023');
      expect(months).toEqual([]);
    });

    it('should throw error for invalid formats', () => {
      expect(() => service.getMonthsBetween('invalid', '01-2023')).toThrow('Invalid MM-YYYY format: invalid or 01-2023');
      expect(() => service.getMonthsBetween('01-2023', 'invalid')).toThrow('Invalid MM-YYYY format: 01-2023 or invalid');
    });
  });

  describe('dateToMMYYYY', () => {
    it('should convert Date to MM-YYYY format', () => {
      const date1 = new Date('2023-01-15T10:30:00.000Z');
      expect(service.dateToMMYYYY(date1)).toBe('01-2023');

      const date2 = new Date('2023-12-01T00:00:00.000Z');
      expect(service.dateToMMYYYY(date2)).toBe('12-2023');

      const date3 = new Date('2024-06-30T23:59:59.999Z');
      expect(service.dateToMMYYYY(date3)).toBe('06-2024');
    });

    it('should handle edge cases', () => {
      const jan1 = new Date('2023-01-01T00:00:00.000Z');
      expect(service.dateToMMYYYY(jan1)).toBe('01-2023');

      const dec31 = new Date('2023-12-31T23:59:59.999Z');
      expect(service.dateToMMYYYY(dec31)).toBe('12-2023');
    });
  });

  describe('mmyyyyToFirstOfMonth', () => {
    it('should convert MM-YYYY to first of month Date', () => {
      const date1 = service.mmyyyyToFirstOfMonth('01-2023');
      expect(date1).toEqual(new Date(Date.UTC(2023, 0, 1))); // January 1, 2023 UTC

      const date2 = service.mmyyyyToFirstOfMonth('12-2024');
      expect(date2).toEqual(new Date(Date.UTC(2024, 11, 1))); // December 1, 2024 UTC

      const date3 = service.mmyyyyToFirstOfMonth('06-2023');
      expect(date3).toEqual(new Date(Date.UTC(2023, 5, 1))); // June 1, 2023 UTC
    });

    it('should always return UTC dates to avoid timezone issues', () => {
      const date = service.mmyyyyToFirstOfMonth('01-2023');
      expect(date.getUTCFullYear()).toBe(2023);
      expect(date.getUTCMonth()).toBe(0); // January
      expect(date.getUTCDate()).toBe(1);
      expect(date.getUTCHours()).toBe(0);
      expect(date.getUTCMinutes()).toBe(0);
      expect(date.getUTCSeconds()).toBe(0);
      expect(date.getUTCMilliseconds()).toBe(0);
    });

    it('should throw error for invalid format', () => {
      expect(() => service.mmyyyyToFirstOfMonth('invalid')).toThrow('Invalid MM-YYYY format: invalid');
      expect(() => service.mmyyyyToFirstOfMonth('13-2023')).toThrow('Invalid MM-YYYY format: 13-2023');
    });
  });

  describe('Round-trip conversions', () => {
    it('should maintain consistency between dateToMMYYYY and mmyyyyToFirstOfMonth', () => {
      const originalDate = new Date(Date.UTC(2023, 5, 1)); // June 1, 2023 UTC
      const mmyyyy = service.dateToMMYYYY(originalDate);
      const convertedDate = service.mmyyyyToFirstOfMonth(mmyyyy);
      
      expect(mmyyyy).toBe('06-2023');
      expect(convertedDate).toEqual(originalDate);
    });

    it('should handle multiple round-trip conversions', () => {
      const testDates = [
        new Date(Date.UTC(2023, 0, 1)), // January
        new Date(Date.UTC(2023, 5, 1)), // June
        new Date(Date.UTC(2023, 11, 1)), // December
        new Date(Date.UTC(2024, 2, 1)), // March
      ];

      for (const originalDate of testDates) {
        const mmyyyy = service.dateToMMYYYY(originalDate);
        const convertedDate = service.mmyyyyToFirstOfMonth(mmyyyy);
        expect(convertedDate).toEqual(originalDate);
      }
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle year boundaries correctly', () => {
      expect(service.addMonths('12-2023', 1)).toBe('01-2024');
      expect(service.subtractMonths('01-2023', 1)).toBe('12-2022');
      expect(service.compareMonths('12-2023', '01-2024')).toBe(-1);
    });

    it('should handle large month additions/subtractions', () => {
      expect(service.addMonths('01-2023', 24)).toBe('01-2025'); // Add 2 years
      expect(service.subtractMonths('01-2025', 24)).toBe('01-2023'); // Subtract 2 years
    });

    it('should handle leap years correctly', () => {
      // February in leap year
      const feb2024 = service.mmyyyyToFirstOfMonth('02-2024');
      expect(feb2024.getUTCFullYear()).toBe(2024);
      expect(feb2024.getUTCMonth()).toBe(1); // February
      expect(feb2024.getUTCDate()).toBe(1);
    });
  });
}); 