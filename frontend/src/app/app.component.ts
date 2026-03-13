import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  ApiGeneratorService,
  ApiResponse,
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
  userApiForm: FormGroup;

  isLoading = false;
  isCreatingUsersTable = false;
  isCreatingApiUser = false;

  apiResponse: ApiResponse | null = null;
  apiUsers: any[] = [];
  userManagementMessage: { type: 'success' | 'danger'; text: string } | null =
    null;
  generatedApiCode: string | null = null;

  expandedSchemas: Set<string> = new Set();

  readonly usersTableSql = `
CREATE TABLE IF NOT EXISTS users_api (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`;

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

    this.userApiForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
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
    this.apiUsers = [];
    this.userManagementMessage = null;
    this.generatedApiCode = null;

    this.apiService
      .analyzeSchema(this.dbForm.value)
      .pipe(
        finalize(() => (this.isLoading = false)), // Se ejecuta siempre, al completar o al dar error
      )
      .subscribe({
        next: (response) => {
          this.apiResponse = response;
          if (response.success) {
            if (response.schema) {
              this.buildSelectionForm(Object.keys(response.schema));
            }
            this.getApiUsers();
          }
        },
        error: (err) => {
          // El error HTTP es manejado por el servicio, aquí recibimos el cuerpo del error
          this.apiResponse = err.error || {
            success: false,
            message: 'Error de comunicación con el servidor.',
          };
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

  isSchemaExpanded(table: string): boolean {
    return this.expandedSchemas.has(table);
  }

  // --- User Management Methods ---

  getApiUsers(): void {
    if (!this.dbForm.valid) return;
    this.apiService.getApiUsers(this.dbForm.value).subscribe({
      next: (res) => {
        if (res.success) {
          this.apiUsers = res.users;
        }
      },
      error: (err) => {
        console.error('Error al obtener usuarios de API:', err);
        this.userManagementMessage = {
          type: 'danger',
          text: 'No se pudieron cargar los usuarios de la API.',
        };
      },
    });
  }

  onCreateUsersTable(): void {
    if (!this.dbForm.valid) return;
    this.isCreatingUsersTable = true;
    this.userManagementMessage = null;

    this.apiService
      .executeSql({ dbConfig: this.dbForm.value, sql: this.usersTableSql })
      .pipe(finalize(() => (this.isCreatingUsersTable = false)))
      .subscribe({
        next: () => {
          this.userManagementMessage = {
            type: 'success',
            text: 'Tabla `users_api` creada o ya existente.',
          };
        },
        error: (err) => {
          this.userManagementMessage = {
            type: 'danger',
            text: err.error?.message || 'Error al crear la tabla de usuarios.',
          };
        },
      });
  }

  onCreateApiUser(): void {
    this.userApiForm.markAllAsTouched();
    if (this.userApiForm.invalid || !this.dbForm.valid) return;

    this.isCreatingApiUser = true;
    this.userManagementMessage = null;
    const { username, password } = this.userApiForm.value;

    this.apiService
      .createApiUser({ dbConfig: this.dbForm.value, username, password })
      .pipe(finalize(() => (this.isCreatingApiUser = false)))
      .subscribe({
        next: (res) => {
          this.userManagementMessage = { type: 'success', text: res.message };
          this.userApiForm.reset();
          Object.keys(this.userApiForm.controls).forEach((key) => {
            this.userApiForm.get(key)?.setErrors(null);
          });
          this.getApiUsers();
        },
        error: (err) => {
          this.userManagementMessage = {
            type: 'danger',
            text: err.error?.message || 'Error al crear el usuario.',
          };
        },
      });
  }

  // --- API Generation ---
  onGenerateApi(): void {
    if (!this.apiResponse?.schema || !this.dbForm.valid) {
      return;
    }
    const payload = {
      dbConfig: this.dbForm.value,
      tables: this.selectionForm.value,
      schema: this.apiResponse.schema,
    };
    this.apiService.generateApi(payload).subscribe({
      next: (res) => {
        this.generatedApiCode = res.generatedApi;
      },
      error: (err) => {
        console.error('Error al generar la API:', err);
      },
    });
  }

  get tableNames(): string[] {
    return this.apiResponse?.schema ? Object.keys(this.apiResponse.schema) : [];
  }
  copy() {
    navigator.clipboard.writeText(this.generatedApiCode || '');
  }
}
