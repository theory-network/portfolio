import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NexusComponents } from './nexus-components';

describe('NexusComponents', () => {
  let component: NexusComponents;
  let fixture: ComponentFixture<NexusComponents>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NexusComponents],
    }).compileComponents();

    fixture = TestBed.createComponent(NexusComponents);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
