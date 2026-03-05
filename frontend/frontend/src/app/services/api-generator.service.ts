import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DbCredentials {
  host: string;
  port: number;
  user: string;
  pass: string;
  dbName: string;
}

export interface ApiResponse {
  success: boolean;
  schema?: { [tableName: string]: any[] };
  message?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ApiGeneratorService {
  private readonly backendUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  /**
   * Envía las credenciales al backend para analizar el esquema de la BD.
   * @param credentials Objeto con los datos de conexión.
   * @returns Un Observable con la respuesta del servidor.
   */
  analyzeSchema(credentials: DbCredentials): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.backendUrl}/analyze-schema`,
      credentials,
    );
  }
}
