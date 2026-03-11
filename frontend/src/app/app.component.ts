import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  ApiGeneratorService,
  ApiResponse,
  Progreso,
} from './services/api-generator.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  dbForm: FormGroup;
  selectionForm: FormGroup; // Nuevo FormGroup para los checkboxes
  isLoading = false;
  apiResponse: ApiResponse | null = null;
  progressBar: Progreso;

  expandedSchemas: Set<string> = new Set();

  constructor(
    private fb: FormBuilder,
    private apiService: ApiGeneratorService,
  ) {}

  ngOnInit(): void {
    // Inicializamos el formulario con valores por defecto y validaciones
    this.dbForm = this.fb.group({
      host: ['127.0.0.1', Validators.required],
      port: [
        3306,
        [Validators.required, Validators.min(1), Validators.max(65535)],
      ],
      user: ['root', Validators.required],
      pass: [''], // La contraseña puede estar vacía
      dbName: ['', Validators.required],
    });
    // Inicializamos el nuevo form group
    this.selectionForm = this.fb.group({});
    this.progressBar = { table: 'especies', porcentaje: 28 };
  }

  onSubmit(): void {
    // Marcar todos los campos como "tocados" para mostrar errores de validación
    this.dbForm.markAllAsTouched();
    if (this.dbForm.invalid) {
      return;
    }

    this.isLoading = true;
    this.apiResponse = null; // Limpiar resultados anteriores
    this.selectionForm = this.fb.group({}); // Limpiar selecciones anteriores

    this.apiService
      .analyzeSchema(this.dbForm.value)
      .pipe(
        finalize(() => (this.isLoading = false)), // Se ejecuta siempre, al completar o al dar error
      )
      .subscribe({
        next: (response) => {
          this.apiResponse = response;
          if (response.success && response.schema) {
            this.buildSelectionForm(Object.keys(response.schema));
          }
          console.log('Respuesta del backend:', response);
        },
        error: (err) => {
          // El error HTTP es manejado por el servicio, aquí recibimos el cuerpo del error
          this.apiResponse = err.error || {
            success: false,
            message: 'Error de comunicación con el servidor.',
          };
          console.error('Error en la petición:', err);
        },
      });
  }

  private buildSelectionForm(tables: string[]): void {
    const tableGroups = tables.reduce(
      (acc: { [key: string]: FormGroup }, table: string) => {
        // Para cada tabla, creamos un grupo de controles
        acc[table] = this.fb.group({
          all: [true],
          read: [true],
          create: [true],
          update: [true],
          delete: [true],
          personal: [false],
        });
        return acc;
      },
      {},
    );
    this.selectionForm = this.fb.group(tableGroups);
  }

  // Se ejecuta cuando el checkbox "all" de una fila cambia
  onAllChange(event: Event, tableName: string): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    const tableGroup = this.selectionForm.get(tableName) as FormGroup;
    if (tableGroup) {
      // Actualiza los 4 checkboxes CRUD con el mismo valor
      tableGroup.patchValue({
        read: isChecked,
        create: isChecked,
        update: isChecked,
        delete: isChecked,
      });
    }
  }

  // Se ejecuta cuando cualquier checkbox CRUD de una fila cambia
  onCrudChange(tableName: string): void {
    const tableGroup = this.selectionForm.get(tableName) as FormGroup;
    const allChecked = ['read', 'create', 'update', 'delete'].every(
      (op) => tableGroup.get(op)?.value,
    );
    tableGroup.get('all')?.setValue(allChecked, { emitEvent: false });
  }

  toggleSchema(table: string): void {
    if (this.expandedSchemas.has(table)) {
      this.expandedSchemas.delete(table);
    } else {
      this.expandedSchemas.add(table);
    }
  }

  generatedApiCode: string | null = null;

  isSchemaExpanded(table: string): boolean {
    return this.expandedSchemas.has(table);
  }

  onGenerateApi(): void {
    const selectedTables = this.selectionForm.value;
    const schema = this.apiResponse?.schema;
    const dbConfig = this.dbForm.value;

    if (!schema) {
      console.error('Schema is not available.');
      return;
    }

    this.apiService.generateApi(selectedTables, schema, dbConfig).subscribe({
      next: (response) => {
        if (response.success) {
          this.generatedApiCode = response.generatedApi;
          console.log('API generated successfully:', this.generatedApiCode);
        } else {
          console.error('API generation failed:', response.message);
        }
      },
      error: (err) => {
        console.error('Error during API generation:', err);
      },
    });
  }

  get tableNames(): string[] {
    return this.apiResponse?.schema ? Object.keys(this.apiResponse.schema) : [];
  }
  copy(){
    navigator.clipboard.writeText(this.generatedApiCode || '');
  }
}
