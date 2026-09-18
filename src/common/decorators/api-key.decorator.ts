import { SetMetadata } from '@nestjs/common';

export const API_KEY = 'isApiKey';
export const api = () => SetMetadata(API_KEY, true);