import { TestBed } from '@angular/core/testing';

import { ApiGeneratorService } from './api-generator.service';

describe('ApiGeneratorService', () => {
  let service: ApiGeneratorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ApiGeneratorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
