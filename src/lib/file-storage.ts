import { promises as fs } from 'fs'
import path from 'path'
import bcrypt from 'bcryptjs'

export interface User {
  id: string
  email: string
  name: string
  password: string
  createdAt: string
}

const USERS_FILE = path.join(process.cwd(), 'data', 'users.json')

export class FileStorage {
  static async ensureDataDir(): Promise<void> {
    const dataDir = path.join(process.cwd(), 'data')
    try {
      await fs.access(dataDir)
    } catch {
      await fs.mkdir(dataDir, { recursive: true })
    }
  }

  static async getUsers(): Promise<User[]> {
    await this.ensureDataDir()
    try {
      const data = await fs.readFile(USERS_FILE, 'utf-8')
      return JSON.parse(data)
    } catch {
      return []
    }
  }

  static async saveUsers(users: User[]): Promise<void> {
    await this.ensureDataDir()
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8')
  }

  static async findUserByEmail(email: string): Promise<User | null> {
    const users = await this.getUsers()
    return users.find(user => user.email === email) || null
  }

  static async createUser(userData: {
    email: string
    name: string
    password: string
  }): Promise<User> {
    const users = await this.getUsers()
    
    const existingUser = users.find(user => user.email === userData.email)
    if (existingUser) {
      throw new Error('用户邮箱已存在')
    }

    const user: User = {
      id: Date.now().toString(),
      email: userData.email,
      name: userData.name,
      password: userData.password,
      createdAt: new Date().toISOString()
    }

    users.push(user)
    await this.saveUsers(users)
    return user
  }

  static async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.findUserByEmail(email)
    if (!user) {
      return null
    }

    const isValid = password === user.password
    return isValid ? user : null
  }
}