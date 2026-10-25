export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          active: boolean
          created_at: string
          group_name: string
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          group_name?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          group_name?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          expires_at: string | null
          first_order_only: boolean
          id: string
          kind: string
          min_order: number
          value: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          expires_at?: string | null
          first_order_only?: boolean
          id?: string
          kind?: string
          min_order?: number
          value?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          expires_at?: string | null
          first_order_only?: boolean
          id?: string
          kind?: string
          min_order?: number
          value?: number
        }
        Relationships: []
      }
      neighborhoods: {
        Row: {
          active: boolean
          fee: number
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          fee?: number
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          fee?: number
          id?: string
          name?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          address: Json | null
          change_for: number | null
          coupon_code: string | null
          created_at: string
          customer_name: string
          delivery_fee: number
          discount: number
          id: string
          items: Json
          mode: string
          notes: string | null
          number: number
          payment_method: string
          phone: string
          pickup_time: string | null
          status: string
          subtotal: number
          table_number: string | null
          total: number
          waiter_email: string | null
        }
        Insert: {
          address?: Json | null
          change_for?: number | null
          coupon_code?: string | null
          created_at?: string
          customer_name: string
          delivery_fee?: number
          discount?: number
          id?: string
          items: Json
          mode: string
          notes?: string | null
          number?: number
          payment_method: string
          phone: string
          pickup_time?: string | null
          status?: string
          subtotal: number
          table_number?: string | null
          total: number
          waiter_email?: string | null
        }
        Update: {
          address?: Json | null
          change_for?: number | null
          coupon_code?: string | null
          created_at?: string
          customer_name?: string
          delivery_fee?: number
          discount?: number
          id?: string
          items?: Json
          mode?: string
          notes?: string | null
          number?: number
          payment_method?: string
          phone?: string
          pickup_time?: string | null
          status?: string
          subtotal?: number
          table_number?: string | null
          total?: number
          waiter_email?: string | null
        }
        Relationships: []
      }
      printers: {
        Row: {
          active: boolean
          address: string
          connection: string
          copies: number
          created_at: string
          id: string
          name: string
          paper_width: string
          sector: string
        }
        Insert: {
          active?: boolean
          address?: string
          connection?: string
          copies?: number
          created_at?: string
          id?: string
          name: string
          paper_width?: string
          sector?: string
        }
        Update: {
          active?: boolean
          address?: string
          connection?: string
          copies?: number
          created_at?: string
          id?: string
          name?: string
          paper_width?: string
          sector?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          active: boolean
          available: boolean
          badge: string | null
          category_id: string | null
          created_at: string
          description: string
          featured: boolean
          id: string
          image_url: string | null
          name: string
          options: Json
          price: number
          promo_price: number | null
          sales_count: number
          size_label: string | null
          sort_order: number
        }
        Insert: {
          active?: boolean
          available?: boolean
          badge?: string | null
          category_id?: string | null
          created_at?: string
          description?: string
          featured?: boolean
          id?: string
          image_url?: string | null
          name: string
          options?: Json
          price?: number
          promo_price?: number | null
          sales_count?: number
          size_label?: string | null
          sort_order?: number
        }
        Update: {
          active?: boolean
          available?: boolean
          badge?: string | null
          category_id?: string | null
          created_at?: string
          description?: string
          featured?: boolean
          id?: string
          image_url?: string | null
          name?: string
          options?: Json
          price?: number
          promo_price?: number | null
          sales_count?: number
          size_label?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          rating: number
          text: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          rating?: number
          text: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          rating?: number
          text?: string
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          address: string | null
          banner_url: string | null
          first_order_coupon: string | null
          hours: Json
          id: number
          instagram: string | null
          logo_url: string | null
          min_delivery: number
          name: string
          open_mode: string
          phone: string | null
          pickup_slots: string[]
          primary_color: string | null
          promo_banner: string | null
          promo_ends_at: string | null
          slogan: string
          table_count: number
          updated_at: string
          whatsapp: string
        }
        Insert: {
          address?: string | null
          banner_url?: string | null
          first_order_coupon?: string | null
          hours?: Json
          id?: number
          instagram?: string | null
          logo_url?: string | null
          min_delivery?: number
          name?: string
          open_mode?: string
          phone?: string | null
          pickup_slots?: string[]
          primary_color?: string | null
          promo_banner?: string | null
          promo_ends_at?: string | null
          slogan?: string
          table_count?: number
          updated_at?: string
          whatsapp?: string
        }
        Update: {
          address?: string | null
          banner_url?: string | null
          first_order_coupon?: string | null
          hours?: Json
          id?: number
          instagram?: string | null
          logo_url?: string | null
          min_delivery?: number
          name?: string
          open_mode?: string
          phone?: string | null
          pickup_slots?: string[]
          primary_color?: string | null
          promo_banner?: string | null
          promo_ends_at?: string | null
          slogan?: string
          table_count?: number
          updated_at?: string
          whatsapp?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "staff"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "staff"],
    },
  },
} as const
