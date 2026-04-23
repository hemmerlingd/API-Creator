import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface DbCredentials {
  host: string;
  port: number;
  user: string;
  pass?: string;
  dbName: string;
}

export interface ApiResponse {
  success: boolean;
  schema?: { [tableName: string]: any[] };
  message?: string;
  tables?: string[];
  error?: string;
}

export interface Progreso {
  table: string;
  porcentaje: number;
}

@Injectable({
  providedIn: 'root',
})
export class ApiGeneratorService {
  private readonly apiUrl = '/api';

  constructor(private http: HttpClient) {}

  private handleError(error: HttpErrorResponse) {
    // Devuelve un observable con un error que el componente puede manejar.
    return throwError(() => error);
  }

  /**
   * Envía las credenciales al backend para analizar el esquema de la BD.
   * @param credentials Objeto con los datos de conexión.
   * @returns Un Observable con la respuesta del servidor.
   */
  analyzeSchema(credentials: DbCredentials): Observable<ApiResponse> {
    return this.http
      .post<ApiResponse>(`${this.apiUrl}/analyze-schema`, credentials)
      .pipe(catchError(this.handleError));
  }

  generateApi(payload: {
    tables: any;
    schema: any;
    dbConfig: DbCredentials;
  }): Observable<any> {
    return this.http
      .post(`${this.apiUrl}/generate-api`, payload)
      .pipe(catchError(this.handleError));
  }

  executeSql(payload: { dbConfig: DbCredentials; sql: string }): Observable<any> {
    return this.http
      .post<any>(`${this.apiUrl}/execute-sql`, payload)
      .pipe(catchError(this.handleError));
  }

  getApiUsers(dbConfig: DbCredentials): Observable<any> {
    return this.http
      .post<any>(`${this.apiUrl}/get-api-users`, { dbConfig })
      .pipe(catchError(this.handleError));
  }

  createApiUser(payload: {
    dbConfig: DbCredentials;
    username: string;
    password: string;
    role: string;
  }): Observable<any> {
    return this.http
      .post<any>(`${this.apiUrl}/create-api-user`, payload)
      .pipe(catchError(this.handleError));
  }

  updateApiUser(payload: {
    dbConfig: DbCredentials;
    id: number;
    username: string;
    password?: string;
    role: string;
  }): Observable<any> {
    return this.http
      .post<any>(`${this.apiUrl}/update-api-user`, payload)
      .pipe(catchError(this.handleError));
  }

  testQuery(payload: { dbConfig: DbCredentials; sql: string }): Observable<any> {
    return this.http
      .post<any>(`${this.apiUrl}/test-query`, payload)
      .pipe(catchError(this.handleError));
  }
}
