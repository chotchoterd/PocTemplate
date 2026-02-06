import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PocTemplate } from './poc-template';

describe('PocTemplate', () => {
  let component: PocTemplate;
  let fixture: ComponentFixture<PocTemplate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PocTemplate]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PocTemplate);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
