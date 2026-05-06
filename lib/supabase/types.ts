export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      bill_accounts: {
        Row: {
          amount_due: number | null;
          autopay: boolean;
          category: string | null;
          created_at: string;
          household_id: string;
          id: string;
          name: string;
          next_due_on: string | null;
          provider: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          amount_due?: number | null;
          autopay?: boolean;
          category?: string | null;
          created_at?: string;
          household_id: string;
          id?: string;
          name: string;
          next_due_on?: string | null;
          provider?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          amount_due?: number | null;
          autopay?: boolean;
          category?: string | null;
          created_at?: string;
          household_id?: string;
          id?: string;
          name?: string;
          next_due_on?: string | null;
          provider?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bill_accounts_household_id_fkey";
            columns: ["household_id"];
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      bill_payments: {
        Row: {
          amount_paid: number;
          bill_account_id: string;
          created_at: string;
          household_id: string;
          id: string;
          note: string | null;
          paid_on: string;
          status: string;
        };
        Insert: {
          amount_paid: number;
          bill_account_id: string;
          created_at?: string;
          household_id: string;
          id?: string;
          note?: string | null;
          paid_on?: string;
          status?: string;
        };
        Update: {
          amount_paid?: number;
          bill_account_id?: string;
          created_at?: string;
          household_id?: string;
          id?: string;
          note?: string | null;
          paid_on?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bill_payments_bill_account_id_fkey";
            columns: ["bill_account_id"];
            referencedRelation: "bill_accounts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bill_payments_household_id_fkey";
            columns: ["household_id"];
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      household_members: {
        Row: {
          created_at: string;
          household_id: string;
          id: string;
          role: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          household_id: string;
          id?: string;
          role?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          household_id?: string;
          id?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey";
            columns: ["household_id"];
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      households: {
        Row: {
          base_currency: string;
          created_at: string;
          created_by: string;
          id: string;
          name: string;
          updated_at: string;
        };
        Insert: {
          base_currency?: string;
          created_at?: string;
          created_by: string;
          id?: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          base_currency?: string;
          created_at?: string;
          created_by?: string;
          id?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string | null;
          email: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          email?: string | null;
          id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          email?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      spending_transactions: {
        Row: {
          amount: number;
          category: string | null;
          created_at: string;
          household_id: string;
          id: string;
          merchant: string;
          note: string | null;
          spent_at: string;
          user_id: string;
        };
        Insert: {
          amount: number;
          category?: string | null;
          created_at?: string;
          household_id: string;
          id?: string;
          merchant: string;
          note?: string | null;
          spent_at?: string;
          user_id: string;
        };
        Update: {
          amount?: number;
          category?: string | null;
          created_at?: string;
          household_id?: string;
          id?: string;
          merchant?: string;
          note?: string | null;
          spent_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "spending_transactions_household_id_fkey";
            columns: ["household_id"];
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};