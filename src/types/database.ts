export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          user_id: string;
          currency: string;
          month_start_day: number;
          usd_idr_rate: number | null;
          usd_idr_rate_updated_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          currency?: string;
          month_start_day?: number;
          usd_idr_rate?: number | null;
          usd_idr_rate_updated_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          currency?: string;
          month_start_day?: number;
          usd_idr_rate?: number | null;
          usd_idr_rate_updated_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          is_archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      income_sources: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          is_archived: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          is_archived?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          type: "income" | "expense";
          amount: number;
          date: string;
          note: string | null;
          category_id: string | null;
          source_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          type: "income" | "expense";
          amount: number;
          date: string;
          note?: string | null;
          category_id?: string | null;
          source_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: "income" | "expense";
          amount?: number;
          date?: string;
          note?: string | null;
          category_id?: string | null;
          source_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "income_sources";
            referencedColumns: ["id"];
          },
        ];
      };
      holdings: {
        Row: {
          id: string;
          user_id: string;
          asset_type: "stock" | "crypto" | "fund" | "gold" | "bond" | "other";
          symbol: string;
          name: string;
          platform: string | null;
          quantity: number | string;
          avg_cost: number | string;
          price_currency: "IDR" | "USD";
          price_source: "manual" | "coingecko";
          provider_ref: string | null;
          manual_price: number | string | null;
          manual_price_updated_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          asset_type: "stock" | "crypto" | "fund" | "gold" | "bond" | "other";
          symbol: string;
          name: string;
          platform?: string | null;
          quantity: number | string;
          avg_cost: number | string;
          price_currency?: "IDR" | "USD";
          price_source?: "manual" | "coingecko";
          provider_ref?: string | null;
          manual_price?: number | string | null;
          manual_price_updated_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          asset_type?: "stock" | "crypto" | "fund" | "gold" | "bond" | "other";
          symbol?: string;
          name?: string;
          platform?: string | null;
          quantity?: number | string;
          avg_cost?: number | string;
          price_currency?: "IDR" | "USD";
          price_source?: "manual" | "coingecko";
          provider_ref?: string | null;
          manual_price?: number | string | null;
          manual_price_updated_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      price_quotes: {
        Row: {
          user_id: string;
          source: "coingecko";
          ref: string;
          currency: "IDR" | "USD";
          price: number | string;
          fetched_at: string;
        };
        Insert: {
          user_id?: string;
          source: "coingecko";
          ref: string;
          currency: "IDR" | "USD";
          price: number | string;
          fetched_at?: string;
        };
        Update: {
          user_id?: string;
          source?: "coingecko";
          ref?: string;
          currency?: "IDR" | "USD";
          price?: number;
          fetched_at?: string;
        };
        Relationships: [];
      };
      debts: {
        Row: {
          id: string;
          user_id: string;
          type: "debt" | "receivable";
          person_name: string;
          amount: number;
          date: string;
          due_date: string | null;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          type: "debt" | "receivable";
          person_name: string;
          amount: number;
          date: string;
          due_date?: string | null;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: "debt" | "receivable";
          person_name?: string;
          amount?: number;
          date?: string;
          due_date?: string | null;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      debt_payments: {
        Row: {
          id: string;
          debt_id: string;
          user_id: string;
          amount: number;
          payment_date: string;
          transaction_id: string | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          debt_id: string;
          user_id?: string;
          amount: number;
          payment_date: string;
          transaction_id?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          debt_id?: string;
          user_id?: string;
          amount?: number;
          payment_date?: string;
          transaction_id?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      period_start: {
        Args: { p_year: number; p_month: number; p_start_day: number };
        Returns: string;
      };
      period_end: {
        Args: { p_year: number; p_month: number; p_start_day: number };
        Returns: string;
      };
      month_summary: {
        Args: { p_year: number; p_month: number; p_start_day?: number | null };
        Returns: {
          total_income: number;
          total_expense: number;
          net: number;
        }[];
      };
      spending_by_category: {
        Args: { p_year: number; p_month: number; p_start_day?: number | null };
        Returns: {
          category_id: string;
          name: string;
          total: number;
        }[];
      };
      income_by_source: {
        Args: { p_year: number; p_month: number; p_start_day?: number | null };
        Returns: {
          source_id: string;
          name: string;
          total: number;
        }[];
      };
      monthly_trend: {
        Args: { p_year: number; p_month: number; p_months?: number; p_start_day?: number | null };
        Returns: {
          year: number;
          month: number;
          total_income: number;
          total_expense: number;
        }[];
      };
      portfolio_holdings: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          asset_type: "stock" | "crypto" | "fund" | "gold" | "bond" | "other";
          symbol: string;
          name: string;
          platform: string | null;
          quantity: number;
          avg_cost: number;
          price_currency: "IDR" | "USD";
          price_source: "manual" | "coingecko";
          current_price: number | null;
          price_as_of: string | null;
          value_native: number | null;
          cost_native: number;
          gain_native: number | null;
          gain_pct: number | null;
          value_idr: number | null;
          cost_idr: number | null;
          gain_idr: number | null;
        }[];
      };
      portfolio_summary: {
        Args: Record<string, never>;
        Returns: {
          total_value_idr: number;
          total_cost_idr: number;
          total_gain_idr: number;
          priced_count: number;
          unpriced_count: number;
        }[];
      };
      portfolio_allocation: {
        Args: Record<string, never>;
        Returns: {
          asset_type: "stock" | "crypto" | "fund" | "gold" | "bond" | "other";
          value_idr: number;
          share_pct: number;
        }[];
      };
      debts_with_balance: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          type: "debt" | "receivable";
          person_name: string;
          amount: number;
          date: string;
          due_date: string | null;
          note: string | null;
          created_at: string;
          paid_amount: number;
          remaining_amount: number;
          status: "pending" | "partially_paid" | "settled";
          is_overdue: boolean;
        }[];
      };
      debts_summary: {
        Args: Record<string, never>;
        Returns: {
          total_unpaid_debt: number;
          total_unpaid_receivable: number;
          unpaid_debt_count: number;
          unpaid_receivable_count: number;
          overdue_count: number;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
