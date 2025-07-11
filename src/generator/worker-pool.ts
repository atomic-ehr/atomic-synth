import { Person } from '../types/index.ts';
import { Worker } from 'worker_threads';

export interface WorkerMessage {
  cmd: 'generate' | 'terminate';
  seeds?: number[];
  options?: any;
}

export interface WorkerResult {
  persons: any[]; // Changed to any[] to handle serialization
  error?: string;
}

export class WorkerPool {
  private workers: Worker[] = [];
  private workerPromises: Map<Worker, Promise<any>> = new Map();
  
  constructor(private size: number) {
    // Initialize workers
    for (let i = 0; i < size; i++) {
      this.createWorker();
    }
  }
  
  private createWorker(): void {
    const worker = new Worker(
      new URL('./generation-worker.ts', import.meta.url).href,
      {
        type: 'module'
      }
    );
    
    this.workers.push(worker);
  }
  
  // Generate persons using the worker pool
  async generate(seeds: number[], options: any): Promise<Person[]> {
    // Split seeds among workers
    const chunks = this.chunkArray(seeds, this.size);
    
    // Send work to each worker
    const promises = chunks.map((chunk, index) => {
      const worker = this.workers[index]!;
      return this.sendToWorker(worker, {
        cmd: 'generate',
        seeds: chunk,
        options
      });
    });
    
    // Wait for all results
    const results = await Promise.all(promises);
    
    // Combine all persons
    const allPersons: Person[] = [];
    for (const result of results) {
      if (result.error) {
        throw new Error(`Worker error: ${result.error}`);
      }
      // Deserialize persons
      for (const serializedPerson of result.persons) {
        allPersons.push(this.deserializePerson(serializedPerson));
      }
    }
    
    return allPersons;
  }
  
  // Send message to worker and wait for response
  private sendToWorker(worker: Worker, message: WorkerMessage): Promise<WorkerResult> {
    return new Promise((resolve, reject) => {
      const handleMessage = (result: WorkerResult) => {
        worker.off('message', handleMessage);
        worker.off('error', handleError);
        resolve(result);
      };
      
      const handleError = (error: Error) => {
        worker.off('message', handleMessage);
        worker.off('error', handleError);
        reject(error);
      };
      
      worker.on('message', handleMessage);
      worker.on('error', handleError);
      worker.postMessage(message);
    });
  }
  
  // Split array into chunks
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    const itemsPerChunk = Math.ceil(array.length / chunkSize);
    
    for (let i = 0; i < array.length; i += itemsPerChunk) {
      chunks.push(array.slice(i, i + itemsPerChunk));
    }
    
    return chunks;
  }
  
  // Deserialize person from worker
  private deserializePerson(data: any): Person {
    // Convert attributes object back to Map
    const attributes = new Map(data.attributes);
    
    // Convert dates
    const birthDate = new Date(data.birthDate);
    const deathDate = data.deathDate ? new Date(data.deathDate) : undefined;
    
    // Reconstruct person
    const person: Person = {
      ...data,
      attributes,
      birthDate,
      deathDate
    };
    
    return person;
  }
  
  // Terminate all workers
  async terminate(): Promise<void> {
    const promises = this.workers.map(worker => worker.terminate());
    await Promise.all(promises);
    this.workers = [];
  }
}