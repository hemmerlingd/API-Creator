import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  ApiGeneratorService,
  ApiResponse,
} from './services/api-generator.service';
import { finalize } from 'rxjs/operators';

declare var bootstrap: any;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  title = 'frontend';
  dbForm: FormGroup;
  selectionForm: FormGroup; // Nuevo FormGroup para los checkboxes
  userApiForm: FormGroup;

  isLoading = false;
  isCreatingUsersTable = false;
  isCreatingApiUser = false;
  editingUserId: number | null = null;

  //MODAL RELACION
  Stable: any;
  campoid: any;
  campo: any;
  relacionarData: any;

  //MODAL CONSULTA
  constable: any;
  nombreConsulta: any;
  consultaData: any = 'SELECT ';
  tipoConsulta: any = 'get';
  queryResults: any[] | null = null;
  queryError: string | null = null;
  queryKeys: string[] = [];

  apiResponse: ApiResponse | null = null;
  apiUsers: any[] = [];
  userManagementMessage: { type: 'success' | 'danger'; text: string } | null =
    null;
  generatedApiCode: string | null = null;
  
  // IDE Preview State
  projectFiles: { name: string; content: string; type: string; readonly: boolean }[] = [];
  selectedFileIndex: number = 0;
  showPreview: boolean = true;
  safePreviewUrl: any = null;

  expandedSchemas: Set<string> = new Set();

  readonly usersTableSql = `
CREATE TABLE IF NOT EXISTS users_api (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'editor', 'lector') NOT NULL DEFAULT 'lector',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`;

  constructor(
    private fb: FormBuilder,
    private apiService: ApiGeneratorService,
    private sanitizer: DomSanitizer
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
      role: ['lector', Validators.required],
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
        const isAdminOnly = table.toLowerCase() === 'users_api';
        // Para cada tabla, creamos un grupo de controles
        acc[table] = this.fb.group({
          all: [true],
          read: [true],
          readRoles: [isAdminOnly ? ['admin'] : ['admin', 'editor', 'lector']],
          isPublicRead: [false],
          create: [true],
          createRoles: [isAdminOnly ? ['admin'] : ['admin', 'editor']],
          update: [true],
          updateRoles: [isAdminOnly ? ['admin'] : ['admin', 'editor']],
          delete: [true],
          deleteRoles: [['admin']],
          customMethods: [[]], // <-- Añadimos el control para alojar nuestras consultas
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

  getApiUsers(importJson: any = null): void {
    if (!this.dbForm.valid) return;
    let busca = this.dbForm.value;
    if (importJson) {
      busca = importJson;
    }
    this.apiService.getApiUsers(busca).subscribe({
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
    
    // Si estamos editando, el password puede estar vacío (no se cambia)
    if (this.editingUserId) {
      if (this.userApiForm.get('username')?.invalid || this.userApiForm.get('role')?.invalid) return;
    } else {
      if (this.userApiForm.invalid) return;
    }

    if (!this.dbForm.valid) return;

    this.isCreatingApiUser = true;
    this.userManagementMessage = null;
    const { username, password, role } = this.userApiForm.value;

    if (this.editingUserId) {
      // UPDATE
      this.apiService
        .updateApiUser({ dbConfig: this.dbForm.value, id: this.editingUserId, username, password, role })
        .pipe(finalize(() => (this.isCreatingApiUser = false)))
        .subscribe({
          next: (res) => {
            this.userManagementMessage = { type: 'success', text: res.message };
            this.onCancelEdit();
            this.getApiUsers();
          },
          error: (err) => {
            this.userManagementMessage = {
              type: 'danger',
              text: err.error?.message || 'Error al actualizar el usuario.',
            };
          },
        });
    } else {
      // CREATE
      this.apiService
        .createApiUser({ dbConfig: this.dbForm.value, username, password, role })
        .pipe(finalize(() => (this.isCreatingApiUser = false)))
        .subscribe({
          next: (res) => {
            this.userManagementMessage = { type: 'success', text: res.message };
            this.userApiForm.reset({ role: 'lector' });
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
  }

  onEditUser(user: any): void {
    this.editingUserId = user.id;
    this.userApiForm.patchValue({
      username: user.username,
      password: '', // No cargamos el hash por seguridad
      role: user.role
    });
    // Quitamos temporalmente el requerimiento de password para editar
    this.userApiForm.get('password')?.setValidators([Validators.minLength(6)]);
    this.userApiForm.get('password')?.updateValueAndValidity();
    
    // Scroll al form
    const el = document.getElementById('api-username');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }

  onCancelEdit(): void {
    this.editingUserId = null;
    this.userApiForm.reset({ role: 'lector' });
    this.userApiForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.userApiForm.get('password')?.updateValueAndValidity();
    Object.keys(this.userApiForm.controls).forEach((key) => {
      this.userApiForm.get(key)?.setErrors(null);
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
        
        const dbName = this.dbForm.get('dbName')?.value || 'mi-api';

        // Build the IDE preview
        this.projectFiles = [
          { name: 'index.js', content: this.generatedApiCode ?? '', type: 'javascript', readonly: false },
          { name: 'docs.html', content: this.buildSwaggerHtml(), type: 'html', readonly: false },
          { name: 'README.md', content: this.buildReadme(), type: 'markdown', readonly: false },
          { name: '.env', content: this.buildDotEnv(), type: 'text', readonly: false },
          { name: 'package.json', content: this.buildPackageJson(), type: 'json', readonly: true }
        ];
        this.selectedFileIndex = 1; // Start with docs.html
        this.showPreview = true;
        this.updateSafePreviewUrl();

        // Scroll to the preview
        setTimeout(() => {
          const el = document.getElementById('ide-preview');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      },
      error: (err) => {
        console.error('Error al generar la API:', err);
      },
    });
  }

  selectFile(index: number) {
    this.selectedFileIndex = index;
    // If selecting docs.html, enable preview by default
    if (this.projectFiles[index].name === 'docs.html') {
      this.showPreview = true;
      this.updateSafePreviewUrl();
    } else {
      this.showPreview = false;
    }
  }

  updateSafePreviewUrl() {
    const html = this.projectFiles[this.selectedFileIndex].content;
    const blob = new Blob([html], { type: 'text/html' });
    if (this.safePreviewUrl) {
      URL.revokeObjectURL(this.safePreviewUrl);
    }
    const url = URL.createObjectURL(blob);
    this.safePreviewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  getSafeHtml(html: string): any {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  openRelationModal(col: any): void {
    this.relacionarData = col;
    this.Stable = '0';
    this.campoid = '0';
    this.campo = '0';

    if (!col || !col.Field) return;

    // Intentar adivinar la tabla (ej. "id_documento" -> "documento" o "documentos")
    let guessedTableName = '';
    const fieldName = col.Field.toLowerCase();
    if (fieldName.startsWith('id_')) {
      guessedTableName = fieldName.substring(3);
    } else if (fieldName.endsWith('_id')) {
      guessedTableName = fieldName.substring(0, fieldName.length - 3);
    }

    // Buscar si esa tabla existe en el esquema (case insensitive), soportando plurales ('s', 'es')
    const targetTable = this.tableNames.find((t) => {
      const lowerT = t.toLowerCase();
      return (
        lowerT === guessedTableName ||
        lowerT === guessedTableName + 's' ||
        lowerT === guessedTableName + 'es'
      );
    });

    if (targetTable) {
      this.Stable = targetTable;
      this.autoSelectFields();
    }
  }

  openConsultaModal(tabla: any): void {
    this.constable = tabla;
    this.nombreConsulta = '';
    this.queryResults = null;
    this.queryError = null;
    this.queryKeys = [];
  }

  onTableSelectChange(): void {
    this.autoSelectFields();
  }

  Enviarvalor(val: any) {
    const tabla_origen = this.constable;
    const campo = val;
    const fieldSelect = `\`${tabla_origen}\`.\`${campo}\``;

    // 1. Si la consulta está vacía o solo tiene la palabra SELECT inicial
    if (
      !this.consultaData ||
      this.consultaData.trim().toUpperCase() === 'SELECT'
    ) {
      this.consultaData = `SELECT \n  ${fieldSelect} \nFROM \`${tabla_origen}\``;
      return;
    }

    // 2. Buscamos dónde comienza la cláusula FROM
    const fromRegex = /\bFROM\b/i;
    const match = this.consultaData.match(fromRegex);

    if (match) {
      const fromIndex = match.index;
      const selectPart = this.consultaData.substring(0, fromIndex).trim();
      let fromPart = this.consultaData.substring(fromIndex).trim();

      // Solo agregamos el campo si no está ya en el SELECT
      if (!selectPart.includes(fieldSelect)) {
        const newSelectPart = `${selectPart},\n  ${fieldSelect}\n`;

        // Verificamos si la tabla_origen ya está en el FROM o en algún JOIN
        const tableRegex = new RegExp(`\\\`?${tabla_origen}\\\`?`, 'i');
        if (!tableRegex.test(fromPart)) {
          // Si no está, buscamos su Primary Key para armar un INNER JOIN de ejemplo
          const schema = this.apiResponse?.schema?.[tabla_origen];
          const pkCol = schema?.find((c: any) => c.Key === 'PRI');
          const pk = pkCol ? pkCol.Field : 'id';

          fromPart += `\nINNER JOIN \`${tabla_origen}\` ON \`${tabla_origen}\`.\`${pk}\` = [[ tabla_origen_origen.campo_origen ]]`;
        }

        this.consultaData = `${newSelectPart}${fromPart}`;
      }
    } else {
      // Por si borraron el FROM manualmente en el textarea
      if (!this.consultaData.includes(fieldSelect)) {
        this.consultaData = `${this.consultaData.trim()},\n  ${fieldSelect}`;
      }
    }
  }

  test() {
    this.queryError = null;
    this.queryResults = null;
    this.queryKeys = [];

    if (
      !this.consultaData ||
      this.consultaData.trim() === '' ||
      this.consultaData.trim().toUpperCase() === 'SELECT'
    ) {
      this.queryError = 'La consulta está vacía o incompleta.';
      return;
    }

    const payload = {
      dbConfig: this.dbForm.value,
      sql: this.consultaData,
    };

    this.apiService.testQuery(payload).subscribe({
      next: (res) => {
        if (res.success) {
          this.queryResults = res.rows;
          if (this.queryResults && this.queryResults.length > 0) {
            this.queryKeys = Object.keys(this.queryResults[0]); // Para construir el <thead>
          }
        } else {
          this.queryError = res.message;
        }
      },
      error: (err) => {
        this.queryError =
          err.error?.message || 'Error al ejecutar la consulta.';
      },
    });
  }

  autoSelectFields(): void {
    if (
      this.Stable &&
      this.Stable !== '0' &&
      this.apiResponse?.schema?.[this.Stable]
    ) {
      const schema = this.apiResponse.schema[this.Stable];
      // Buscar la Primary Key, o tomar el primer campo como fallback
      const pkCol = schema.find((c: any) => c.Key === 'PRI');
      this.campoid = pkCol ? pkCol.Field : schema[0]?.Field || '0';

      // Tomar el segundo campo como el "dato a mostrar", o el primero si solo hay uno
      this.campo =
        schema.length > 1 ? schema[1].Field : schema[0]?.Field || '0';
    } else {
      this.campoid = '0';
      this.campo = '0';
    }
  }

  saveNewMethod(
    tableName: any,
    name: any,
    type: any,
    query: any,
    isPublic: boolean = false,
    roles: string[] = ['admin']
  ) {
    if (tableName && name && query && name !== '0' && query !== '0') {
      const tableGroup = this.selectionForm.get(tableName);
      if (tableGroup) {
        let customMethods = tableGroup.get('customMethods')?.value;
        if (!customMethods || !Array.isArray(customMethods)) {
          customMethods = [];
        }
        // Agregamos la consulta al listado de métodos
        customMethods.push({
          name: name,
          type: type,
          query: query,
          isPublic: isPublic,
          roles: roles,
        });
        // Actualizamos el valor en el formulario con una nueva referencia de array
        tableGroup.get('customMethods')?.setValue([...customMethods]);

        // Limpiar campos del modal para la próxima vez
        this.nombreConsulta = '';
        this.consultaData = 'SELECT ';
        this.tipoConsulta = 'get';
        this.queryResults = null;
        this.queryError = null;
        this.queryKeys = [];
      }
    }
  }

  // Ayudante para obtener roles seleccionados de un <select multiple>
  getSelectedRoles(selectElement: HTMLSelectElement): string[] {
    return Array.from(selectElement.selectedOptions).map(
      (option) => option.value
    );
  }

  relacionar(origen: any, tabla: any, campoid: any, campo: any) {
    // Validamos que vengan los datos correctos
    if (origen && tabla && campo && tabla !== '0' && campo !== '0') {
      // Cambiamos el 'Key' para que la UI muestre la etiqueta 'FK' dinámicamente
      origen.Key = 'FK';
      // Agregamos el objeto de la relación al campo
      origen.relatedWith = {
        table: tabla,
        fieldId: campoid,
        fieldShow: campo,
      };
    }
  }

  get tableNames(): string[] {
    return this.apiResponse?.schema ? Object.keys(this.apiResponse.schema) : [];
  }

  showToast(message: string, type: 'success' | 'danger' = 'success') {
    const toastElement = document.getElementById('liveToast');
    if (toastElement) {
      const body = toastElement.querySelector('.toast-body');
      const header = toastElement.querySelector('.toast-header');
      const title = toastElement.querySelector('strong');
      
      if (body) body.textContent = message;
      if (title) title.textContent = type === 'success' ? '¡Éxito!' : '¡Error!';
      if (header) {
        header.classList.remove('bg-success', 'bg-danger');
        header.classList.add(type === 'success' ? 'bg-success' : 'bg-danger');
      }
      
      const toast = new bootstrap.Toast(toastElement);
      toast.show();
    }
  }

  buildPackageJson(): string {
    const dbName = this.dbForm.get('dbName')?.value || 'mi-api';
    const indexJsContent = this.generatedApiCode || '';
    const deps: Record<string, string> = {
      'express': '^4.21.0',
      'mysql2': '^3.11.0',
      'cors': '^2.8.5',
      'dotenv': '^16.4.5',
    };
    if (indexJsContent.includes("require('jsonwebtoken')") || indexJsContent.includes('jsonwebtoken')) {
      deps['jsonwebtoken'] = '^9.0.2';
    }
    if (indexJsContent.includes("require('bcryptjs')") || indexJsContent.includes('bcryptjs')) {
      deps['bcryptjs'] = '^3.0.2';
    }

    const packageJson = {
      name: dbName + '-api',
      version: '1.0.0',
      description: `API generada automáticamente para la base de datos ${dbName}`,
      main: 'index.js',
      scripts: {
        start: 'node index.js',
      },
      keywords: [],
      author: 'API Creator',
      license: 'ISC',
      type: 'commonjs',
      dependencies: deps,
    };
    return JSON.stringify(packageJson, null, 2);
  }

  buildDotEnv(): string {
    const dbName = this.dbForm.get('dbName')?.value || 'mi-api';
    const dbConfig = this.dbForm.value;
    return `PORT=3002
JWT_SECRET=your_super_random_secret_key_here
DB_HOST=${dbConfig.host || '127.0.0.1'}
DB_PORT=${dbConfig.port || 3306}
DB_USER=${dbConfig.user || 'root'}
DB_PASS=${dbConfig.pass || ''}
DB_NAME=${dbConfig.dbName || dbName}
`;
  }

  downloadZip() {
    if (this.projectFiles.length === 0) return;

    const dbName = this.dbForm.get('dbName')?.value || 'mi-api';
    const zip = new JSZip();

    // Add all files from the IDE (including any user edits)
    this.projectFiles.forEach(file => {
      zip.file(file.name, file.content);
    });

    // Generate and download the ZIP
    zip.generateAsync({ type: 'blob' }).then((content: Blob) => {
      saveAs(content, `${dbName}-api.zip`);
      this.showToast('Proyecto ZIP generado y descargado correctamente.');
    });
  }


  buildReadme(): string {
    if (!this.apiResponse?.schema || !this.selectionForm?.value) return '';

    const dbName = this.dbForm.get('dbName')?.value || 'mi-api';
    const tables = this.selectionForm.value;
    const schema = this.apiResponse.schema;

    let readme = `# API: ${dbName}\n`;
    readme += `Generated automatically by API Creator.\n\n`;

    readme += `## HTML FRONTEND\n`;
    readme += `- The project includes a functional and interactive frontend in \`docs.html\`.\n`;
    readme += `- To use it, simply open \`docs.html\` in your browser or access the \`/api\` endpoint while the server is running.\n`;
    readme += `- It allows testing all endpoints, managing JWT tokens, and visualizing response data in real-time.\n\n`;

    readme += `## Endpoints\n`;
    readme += `Below is a list of the generated endpoints for each table:\n\n`;

    // Auth endpoint
    readme += `### Auth\n`;
    readme += `- **POST** \`/api/login\`: Authenticate user and get JWT token. (🌐 Public)\n\n`;

    for (const table in tables) {
      if (!tables.hasOwnProperty(table)) continue;
      const ops = tables[table];
      const tableSchema: any[] = schema[table] || [];
      const pk = tableSchema.find((c: any) => c.Key === 'PRI')?.Field || 'id';

      readme += `### Table: ${table}\n`;
      
      if (ops.read) {
        const readAuth = ops.isPublicRead ? '🌐 Public' : '🔒 JWT Required';
        const readRoles = (ops.readRoles || ['admin', 'editor', 'lector']).join(', ');
        readme += `- **GET** \`/api/${table}\`: Get all records. (${readAuth}, Roles: ${readRoles})\n`;
        readme += `- **GET** \`/api/${table}/{${pk}}\`: Get a record by ID. (${readAuth}, Roles: ${readRoles})\n`;
      }
      if (ops.create) {
        const createRoles = (ops.createRoles || ['admin', 'editor']).join(', ');
        readme += `- **POST** \`/api/${table}\`: Create a new record. (🔒 JWT Required, Roles: ${createRoles})\n`;
      }
      if (ops.update) {
        const updateRoles = (ops.updateRoles || ['admin', 'editor']).join(', ');
        readme += `- **PUT** \`/api/${table}/{${pk}}\`: Update an existing record. (🔒 JWT Required, Roles: ${updateRoles})\n`;
      }
      if (ops.delete) {
        const deleteRoles = (ops.deleteRoles || ['admin']).join(', ');
        readme += `- **DELETE** \`/api/${table}/{${pk}}\`: Delete a record. (🔒 JWT Required, Roles: ${deleteRoles})\n`;
      }

      // Custom methods
      const customMethods: any[] = ops.customMethods || [];
      customMethods.forEach((m: any) => {
        const methodUpper = (m.type || 'get').toUpperCase();
        const auth = (m.isPublic && m.type === 'get') ? '🌐 Public' : '🔒 JWT Required';
        const roles = (m.roles || ['admin']).join(', ');
        readme += `- **${methodUpper}** \`/api/${table}/custom/${m.name}\`: Custom query: ${m.name}. (${auth}, Roles: ${roles})\n`;
      });
      readme += `\n`;
    }

    readme += `### Modifying Permissions & Roles\n`;
    readme += `Access control is handled via middlewares in \`index.js\`.\n`;
    readme += `- To modify who can access an endpoint, find the corresponding route and update the \`checkRole(['role1', 'role2'])\` array.\n`;
    readme += `- **Example**: If a table is restricted to 'admin' and you want to add 'editor', change \`checkRole(['admin'])\` to \`checkRole(['admin', 'editor'])\`.\n\n`;

    readme += `### Security & Environment Variables\n`;
    readme += `For production environments, it is **critical** to avoid hardcoding sensitive information like \`JWT_SECRET\` or database credentials directly in your code.\n\n`;
    readme += `1. **Why?**: Hardcoded secrets can be easily exposed if your code is pushed to a version control system like GitHub.\n`;
    readme += `2. **The Solution**: Use a \`.env\` file (make sure to add it to your \`.gitignore\`) and the \`dotenv\` package.\n`;
    readme += `3. **Procedure**:\n`;
    readme += `   - Modify the \`.env\` file in the project root:\n`;
    readme += `     \`\`\`text\n`;
    readme += `     PORT=3002\n`;
    readme += `     JWT_SECRET=your_super_random_secret_string\n`;
    readme += `     DB_HOST=127.0.0.1\n`;
    readme += `     DB_USER=root\n`;
    readme += `     DB_PASS=your_password\n`;
    readme += `     DB_NAME=${dbName}\n`;
    readme += `     \`\`\`\n`;
    readme += `   - At the very top of \`index.js\`, add: \`require('dotenv').config();\`\n`;
    readme += `   - Replace hardcoded values with \`process.env.VARIABLE_NAME\` (e.g., \`const JWT_SECRET = process.env.JWT_SECRET;\`).\n\n`;

    readme += `## Installation\n`;
    readme += `1. **Install Dependencies**:\n   \`\`\`bash\n   npm install\n   \`\`\`\n`;
    readme += `2. **Start the Server**:\n   \`\`\`bash\n   npm start\n   \`\`\`\n`;
    readme += `3. **Configuration**:\n`;
    readme += `   - **Port**: The API runs on port **3002** by default. You can change this at the bottom of \`index.js\` (\`const PORT = process.env.PORT || 3002;\`).\n`;
    readme += `   - **Database**: Connection details are at the top of \`index.js\`.\n\n`;

    return readme;
  }

  buildSwaggerHtml(): string {
    if (!this.apiResponse?.schema || !this.selectionForm?.value) return '';

    const dbName = this.dbForm.get('dbName')?.value || 'mi-api';
    const suggestedHost = 'localhost';
    const suggestedPort = 3002;
    const tables = this.selectionForm.value;
    const schema = this.apiResponse.schema;

    // ---- collect all endpoints ----
    interface EndpointDef {
      method: string;
      path: string;
      summary: string;
      tag: string;
      auth: boolean;
      roles: string[];
      pathParams: string[];
      requestBody?: any;
      responseExample?: string;
    }

    const endpoints: EndpointDef[] = [];

    // POST /api/login — always present
    endpoints.push({
      method: 'POST',
      path: '/api/login',
      summary: 'Autenticar usuario y obtener JWT token',
      tag: 'Auth',
      auth: false,
      roles: [],
      pathParams: [],
      requestBody: { username: '', password: '' },
      responseExample: JSON.stringify({ success: true, token: '<jwt>', role: 'lector' }, null, 2),
    });

    for (const table in tables) {
      if (!tables.hasOwnProperty(table)) continue;
      const ops = tables[table];
      const tableSchema: any[] = schema[table] || [];
      const pk = tableSchema.find((c: any) => c.Key === 'PRI')?.Field || 'id';

      const exampleRow: any = {};
      tableSchema.forEach((c: any) => {
        if (c.Field === pk) exampleRow[c.Field] = 1;
        else if (c.Type?.includes('int')) exampleRow[c.Field] = 0;
        else if (c.Type?.includes('decimal') || c.Type?.includes('float')) exampleRow[c.Field] = 0.0;
        else if (c.Type?.includes('date')) exampleRow[c.Field] = '2025-01-01';
        else exampleRow[c.Field] = '';
      });

      if (ops.read) {
        const readRoles: string[] = ops.readRoles || ['admin', 'editor', 'lector'];
        endpoints.push({
          method: 'GET',
          path: `/api/${table}`,
          summary: `Obtener todos los registros de ${table}`,
          tag: table,
          auth: !ops.isPublicRead,
          roles: readRoles,
          pathParams: [],
          responseExample: JSON.stringify([exampleRow], null, 2),
        });
        endpoints.push({
          method: 'GET',
          path: `/api/${table}/{${pk}}`,
          summary: `Obtener un registro de ${table} por ${pk}`,
          tag: table,
          auth: !ops.isPublicRead,
          roles: readRoles,
          pathParams: [pk],
          responseExample: JSON.stringify(exampleRow, null, 2),
        });
      }

      if (ops.create) {
        const createRoles: string[] = ops.createRoles || ['admin', 'editor'];
        const body = { ...exampleRow };
        delete body[pk];
        endpoints.push({
          method: 'POST',
          path: `/api/${table}`,
          summary: `Crear un nuevo registro en ${table}`,
          tag: table,
          auth: true,
          roles: createRoles,
          pathParams: [],
          requestBody: body,
          responseExample: JSON.stringify({ [pk]: 1, ...body }, null, 2),
        });
      }

      if (ops.update) {
        const updateRoles: string[] = ops.updateRoles || ['admin', 'editor'];
        const body = { ...exampleRow };
        delete body[pk];
        endpoints.push({
          method: 'PUT',
          path: `/api/${table}/{${pk}}`,
          summary: `Actualizar un registro en ${table}`,
          tag: table,
          auth: true,
          roles: updateRoles,
          pathParams: [pk],
          requestBody: body,
          responseExample: JSON.stringify({ message: `${table} updated successfully` }, null, 2),
        });
      }

      if (ops.delete) {
        const deleteRoles: string[] = ops.deleteRoles || ['admin'];
        endpoints.push({
          method: 'DELETE',
          path: `/api/${table}/{${pk}}`,
          summary: `Eliminar un registro de ${table}`,
          tag: table,
          auth: true,
          roles: deleteRoles,
          pathParams: [pk],
          responseExample: JSON.stringify({ message: `${table} deleted successfully` }, null, 2),
        });
      }

      // Custom methods
      const customMethods: any[] = ops.customMethods || [];
      customMethods.forEach((m: any) => {
        const methodUpper = (m.type || 'get').toUpperCase();
        const customRoles: string[] = m.roles || ['admin'];
        endpoints.push({
          method: methodUpper,
          path: `/api/${table}/custom/${m.name}`,
          summary: `[Custom] ${m.name} — ${table}`,
          tag: table,
          auth: !(m.isPublic && m.type === 'get'),
          roles: customRoles,
          pathParams: [],
          requestBody: methodUpper !== 'GET' ? {} : undefined,
          responseExample: JSON.stringify([{ result: '...' }], null, 2),
        });
      });
    }

    const methodColor: Record<string, string> = {
      GET: '#61affe',
      POST: '#49cc90',
      PUT: '#fca130',
      DELETE: '#f93e3e',
    };

    const allTags = [...new Set(endpoints.map(e => e.tag))];

    const renderEndpoint = (ep: EndpointDef, idx: number) => {
      const color = methodColor[ep.method] || '#aaa';
      const badgeStyle = `background:${color};color:#fff;font-weight:700;padding:4px 10px;border-radius:4px;min-width:70px;display:inline-block;text-align:center;font-size:13px;`;
      const authBadge = ep.auth
        ? `<span class="jwt-badge" style="border:1px solid #d4b106;color:#d4b106;border-radius:4px;padding:1px 6px;font-size:11px;margin-left:8px;">🔒 JWT</span>`
        : `<span style="border:1px solid #49cc90;color:#49cc90;border-radius:4px;padding:1px 6px;font-size:11px;margin-left:8px;">🌐 Público</span>`;
      const rolesBadges = ep.roles.map(r =>
        `<span style="background:#e8f0fe;color:#1a73e8;border-radius:10px;padding:1px 8px;font-size:11px;margin-right:4px;">${r}</span>`
      ).join('');

      const paramInputs = ep.pathParams.map(p => `
        <div style="margin-bottom:10px;">
          <label style="display:block;font-size:12px;font-weight:600;color:#555;">Param: ${p}</label>
          <input type="text" class="param-input" data-param="${p}" style="width:100%;padding:6px;border:1px solid #ccc;border-radius:4px;font-size:13px;" placeholder="Value for ${p}">
        </div>
      `).join('');

      const bodyInput = ep.requestBody !== undefined ? `
        <div style="margin-top:10px;">
          <label style="display:block;font-size:12px;font-weight:600;color:#555;margin-bottom:4px;">Request Body (JSON)</label>
          <textarea class="body-input" style="width:100%;height:120px;background:#272822;color:#f8f8f2;padding:10px;border-radius:6px;font-size:12px;font-family:monospace;border:none;">${JSON.stringify(ep.requestBody, null, 2)}</textarea>
        </div>
      ` : '';

      return `
      <div class="endpoint-card" style="border:1px solid #e0e0e0;border-radius:8px;margin-bottom:12px;overflow:hidden;background:#fff;" 
           data-method="${ep.method}" data-path-template="${ep.path}" data-auth="${ep.auth}" data-roles='${JSON.stringify(ep.roles)}'>
        <div class="ep-header" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none';"
          style="display:flex;align-items:center;gap:12px;padding:12px 16px;cursor:pointer;background:#fafafa;border-bottom:1px solid #eee;">
          <span style="${badgeStyle}">${ep.method}</span>
          <span style="font-family:monospace;font-size:14px;color:#3b3b3b;flex:1;">${ep.path}</span>
          ${authBadge}
          <span style="color:#888;font-size:13px;flex:2;">${ep.summary}</span>
          <span style="color:#888;">▼</span>
        </div>
        <div class="ep-body" style="display:none;padding:16px;">
          ${ep.auth ? `<div style="margin-bottom:12px;font-size:12px;color:#555;"><strong>Roles:</strong> ${rolesBadges}</div>` : ''}
          
          <div style="background:#fcfcfc;border:1px solid #eee;padding:15px;border-radius:8px;margin-bottom:15px;">
            <h5 style="margin-top:0;margin-bottom:10px;font-size:14px;color:#444;">Try it out</h5>
            ${paramInputs}
            ${bodyInput}
            <button onclick="window.executeRequest(this)" style="background:#1a73e8;color:white;border:none;padding:8px 16px;border-radius:4px;cursor:pointer;font-weight:600;margin-top:10px;">Execute</button>
          </div>

          <div class="response-area" style="display:none;">
            <h5 style="margin-bottom:8px;font-size:14px;color:#444;">Response</h5>
            <div class="response-status" style="font-size:13px;margin-bottom:4px;font-weight:600;"></div>
            <pre class="response-body" style="background:#272822;color:#f8f8f2;padding:10px;border-radius:6px;font-size:12px;overflow:auto;max-height:300px;"></pre>
          </div>

          <div style="margin-top:15px;">
            <h5 style="margin-bottom:8px;font-size:14px;color:#444;">Example</h5>
            <pre style="background:#f4f4f4;padding:10px;border-radius:6px;font-size:12px;overflow:auto;color:#666;">${ep.responseExample?.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</pre>
          </div>
        </div>
      </div>`;
    };

    const tagSections = allTags.map(tag => {
      const tagEndpoints = endpoints
        .map((ep, i) => ({ ep, i }))
        .filter(({ ep }) => ep.tag === tag)
        .map(({ ep, i }) => renderEndpoint(ep, i)).join('');

      const tagColor = tag === 'Auth' ? '#e74c3c' : '#1a73e8';
      return `
      <div style="margin-bottom:30px;">
        <div style="background:${tagColor};color:#fff;padding:12px 16px;border-radius:8px 8px 0 0;font-weight:700;font-size:16px;">
          ${tag}
        </div>
        <div style="padding:15px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 8px 8px;background:#f9f9f9;">
          ${tagEndpoints}
        </div>
      </div>`;
    }).join('');

    const totalEndpoints = endpoints.length;
    const now = new Date().toLocaleString('es-AR');

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>API Docs — ${dbName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f0f2f5; color: #333; line-height: 1.5; }
    .swagger-header {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%);
      padding: 40px 40px; color: #fff;
    }
    .swagger-header h1 { font-size: 32px; font-weight: 800; }
    .swagger-header .meta { margin-top: 15px; display: flex; gap: 25px; font-size: 13px; color: #cdd8ea; }
    
    .auth-section {
      background: #fff; border-bottom: 1px solid #ddd; padding: 15px 40px;
      display: flex; align-items: center; gap: 20px; sticky; top: 0; z-index: 100;
    }
    .auth-input-group { display: flex; align-items: center; gap: 10px; flex: 1; max-width: 600px; }
    .auth-input-group input { flex: 1; padding: 8px 12px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; }
    
    .content { max-width: 1200px; margin: 0 auto; padding: 30px 20px; }
    .server-info { margin-bottom: 20px; color: #666; font-size: 14px; }
    .server-url { font-family: monospace; background: #e8f0fe; color: #1a73e8; padding: 2px 8px; border-radius: 4px; }
    
    pre { white-space: pre-wrap; word-break: break-all; }

    /* Custom Toast */
    #custom-toast {
      visibility: hidden;
      min-width: 280px;
      background-color: #333;
      color: #fff;
      text-align: center;
      border-radius: 12px;
      padding: 16px;
      position: fixed;
      z-index: 9999;
      right: 30px;
      bottom: 30px;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      opacity: 0;
      transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      transform: translateY(50px) scale(0.9);
      border-left: 5px solid #49cc90;
    }
    #custom-toast.show {
      visibility: visible;
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  </style>
</head>
<body>

<div class="swagger-header">
  <h1>${dbName} API <span style="font-size:16px; background:#49cc90; padding:3px 8px; border-radius:4px; vertical-align:middle;">v1.0</span></h1>
  <div class="meta">
    <span>📅 Generated: ${now}</span>
    <span>🔗 Origin: <span id="display-origin"></span></span>
    <span>📌 ${totalEndpoints} endpoints</span>
  </div>
</div>

<div class="auth-section">
  <div class="auth-input-group">
    <strong style="font-size:14px; color:#444;">Bearer Token:</strong>
    <input type="text" id="jwt-token" placeholder="Paste your JWT here...">
    <button onclick="saveToken()" style="background:#49cc90; color:white; border:none; padding:8px 15px; border-radius:4px; cursor:pointer; font-weight:600;">Save</button>
  </div>
  <div style="font-size:12px; color:#888;">
    Token will be added to the Authorization header
  </div>
</div>

<div class="content">
  <div class="server-info" style="display:flex; align-items:center; gap:10px;">
    <strong>API Server URL:</strong> 
    <input type="text" id="base-url-input" class="server-url" style="flex:1; max-width:400px; padding:4px 10px; border:1px solid #1a73e8; border-radius:4px; font-family:monospace;" value="">
    <small style="color:#666;">(Change this if your API runs on a different port/host)</small>
  </div>

<script>
  function showToast(message) {
    var toast = document.getElementById('custom-toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(function() {
      toast.classList.remove('show');
    }, 3000);
  }

  function saveToken() {
    var token = document.getElementById('jwt-token').value;
    localStorage.setItem('api_token', token || '');
    showToast('🚀 Token saved to local storage');
    updateAuthUI();
  }

  function executeRequest(btn) {
    var card = btn.closest('.endpoint-card');
    var method = card.dataset.method;
    var pathTemplate = card.dataset.pathTemplate;
    var needsAuth = card.dataset.auth === 'true';
    var responseArea = card.querySelector('.response-area');
    var statusDiv = card.querySelector('.response-status');
    var bodyPre = card.querySelector('.response-body');
    
    var path = pathTemplate;
    var paramInputs = card.querySelectorAll('.param-input');
    paramInputs.forEach(function(input) {
      path = path.replace('{' + input.dataset.param + '}', input.value);
    });

    var baseUrl = document.getElementById('base-url-input').value.replace(new RegExp('/$'), '');
    var url = baseUrl + path;
    
    var options = {
      method: method,
      headers: { 'Content-Type': 'application/json' }
    };

    if (needsAuth) {
      var token = document.getElementById('jwt-token').value;
      if (token) options.headers['Authorization'] = 'Bearer ' + token;
    }

    var bodyTextarea = card.querySelector('.body-input');
    if (bodyTextarea && method !== 'GET') {
      options.body = bodyTextarea.value;
    }

    responseArea.style.display = 'block';
    statusDiv.textContent = 'Loading...';
    bodyPre.textContent = '';

    var startTime = Date.now();
    fetch(url, options)
      .then(function(response) {
        var duration = Date.now() - startTime;
        statusDiv.textContent = 'Status: ' + response.status + ' (' + response.statusText + ') - ' + duration + 'ms';
        statusDiv.style.color = response.ok ? '#2ecc71' : '#e74c3c';
        return response.json();
      })
      .then(function(data) {
        bodyPre.textContent = JSON.stringify(data, null, 2);
      })
      .catch(function(err) {
        statusDiv.textContent = 'Error: ' + err.message;
        statusDiv.style.color = '#e74c3c';
        bodyPre.textContent = 'Failed to connect to the server. Check CORS and API status.';
      });
  }
  window.executeRequest = executeRequest;

  function updateAuthUI() {
    var token = document.getElementById('jwt-token').value;
    var userRole = null;
    
    if (token) {
      try {
        var base64Url = token.split('.')[1];
        var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        var jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        var payload = JSON.parse(jsonPayload);
        userRole = payload.role;
      } catch(e) {
        console.error('Error decoding token', e);
      }
    }

    var cards = document.querySelectorAll('.endpoint-card');
    cards.forEach(function(card) {
      var badge = card.querySelector('.jwt-badge');
      if (!badge) return; // Public endpoint
      
      var roles = JSON.parse(card.dataset.roles || '[]');
      if (userRole && roles.indexOf(userRole) !== -1) {
        badge.innerHTML = '🔓 Autorizado';
        badge.style.border = '1px solid #49cc90';
        badge.style.color = '#49cc90';
      } else if (token) {
        badge.innerHTML = '🔒 No Autorizado';
        badge.style.border = '1px solid #f93e3e';
        badge.style.color = '#f93e3e';
      } else {
        badge.innerHTML = '🔒 JWT Requerido';
        badge.style.border = '1px solid #d4b106';
        badge.style.color = '#d4b106';
      }
    });
  }

  window.onload = function() {
    var savedToken = localStorage.getItem('api_token');
    if (savedToken) {
      document.getElementById('jwt-token').value = savedToken;
      updateAuthUI();
    }
    
    var origin = window.location.origin;
    document.getElementById('display-origin').textContent = origin;
    
    var isBlob = window.location.protocol === 'blob:';
    var defaultBaseUrl = isBlob ? 'http://${suggestedHost}:${suggestedPort}' : origin;
    document.getElementById('base-url-input').value = defaultBaseUrl;
  };
</script>
  ${tagSections}
  <div id="custom-toast"></div>
</div>


</body>
</html>`;

    return html;
  }

  saveJSON(nombre: string) {
    const projectData = {
      dbConfig: this.dbForm.value,
      apiResponse: this.apiResponse,
      selectionForm: this.selectionForm.value,
      consultaData: this.consultaData,
    };
    const blob = new Blob([JSON.stringify(projectData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre + ' APIGenerator-Proyect.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  importJSON(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const projectData = JSON.parse(e.target?.result as string);

          if (projectData.dbConfig) {
            this.dbForm.patchValue(projectData.dbConfig);
          }
          if (projectData.apiResponse) {
            this.apiResponse = projectData.apiResponse;
            if (this.apiResponse?.schema) {
              this.buildSelectionForm(Object.keys(this.apiResponse.schema));
            }
          }
          if (projectData.selectionForm) {
            this.selectionForm.patchValue(projectData.selectionForm);
          }
          if (projectData.consultaData) {
            this.consultaData = projectData.consultaData;
          }
          this.getApiUsers(projectData.dbConfig);
        } catch (error) {
          console.error('Error parseando el archivo JSON', error);
          this.showToast('Error al importar: el archivo no tiene un formato válido.', 'danger');
        }
      };
      reader.readAsText(file);
    }
    // Limpiar el input para permitir importar el mismo archivo de nuevo si se necesita
    input.value = '';
  }
}
