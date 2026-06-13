export class User {
  constructor(public readonly id: string) {}
}

export enum UserRole {
  Admin = 'admin',
  Member = 'member',
}
