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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      AlertRule: {
        Row: {
          createdAt: string
          enabled: boolean
          id: string
          metric: string
          operator: Database["public"]["Enums"]["AlertOperator"]
          projectId: string
          threshold: number
        }
        Insert: {
          createdAt?: string
          enabled?: boolean
          id: string
          metric: string
          operator?: Database["public"]["Enums"]["AlertOperator"]
          projectId: string
          threshold: number
        }
        Update: {
          createdAt?: string
          enabled?: boolean
          id?: string
          metric?: string
          operator?: Database["public"]["Enums"]["AlertOperator"]
          projectId?: string
          threshold?: number
        }
        Relationships: [
          {
            foreignKeyName: "AlertRule_projectId_fkey"
            columns: ["projectId"]
            isOneToOne: false
            referencedRelation: "Project"
            referencedColumns: ["id"]
          },
        ]
      }
      AlertViolation: {
        Row: {
          actualValue: number
          alertRuleId: string
          auditRunId: string
          createdAt: string
          id: string
          metricKey: string
          operator: Database["public"]["Enums"]["AlertOperator"]
          threshold: number
        }
        Insert: {
          actualValue: number
          alertRuleId: string
          auditRunId: string
          createdAt?: string
          id: string
          metricKey: string
          operator: Database["public"]["Enums"]["AlertOperator"]
          threshold: number
        }
        Update: {
          actualValue?: number
          alertRuleId?: string
          auditRunId?: string
          createdAt?: string
          id?: string
          metricKey?: string
          operator?: Database["public"]["Enums"]["AlertOperator"]
          threshold?: number
        }
        Relationships: [
          {
            foreignKeyName: "AlertViolation_alertRuleId_fkey"
            columns: ["alertRuleId"]
            isOneToOne: false
            referencedRelation: "AlertRule"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "AlertViolation_auditRunId_fkey"
            columns: ["auditRunId"]
            isOneToOne: false
            referencedRelation: "AuditRun"
            referencedColumns: ["id"]
          },
        ]
      }
      AuditRun: {
        Row: {
          createdAt: string
          errorMessage: string | null
          finishedAt: string | null
          id: string
          projectId: string
          rawData: Json | null
          startedAt: string | null
          status: Database["public"]["Enums"]["AuditStatus"]
        }
        Insert: {
          createdAt?: string
          errorMessage?: string | null
          finishedAt?: string | null
          id: string
          projectId: string
          rawData?: Json | null
          startedAt?: string | null
          status?: Database["public"]["Enums"]["AuditStatus"]
        }
        Update: {
          createdAt?: string
          errorMessage?: string | null
          finishedAt?: string | null
          id?: string
          projectId?: string
          rawData?: Json | null
          startedAt?: string | null
          status?: Database["public"]["Enums"]["AuditStatus"]
        }
        Relationships: [
          {
            foreignKeyName: "AuditRun_projectId_fkey"
            columns: ["projectId"]
            isOneToOne: false
            referencedRelation: "Project"
            referencedColumns: ["id"]
          },
        ]
      }
      Finding: {
        Row: {
          auditRunId: string
          category: Database["public"]["Enums"]["FindingCategory"]
          createdAt: string
          displayValue: string | null
          id: string
          key: string
          severity: Database["public"]["Enums"]["FindingSeverity"]
          source: string
          status: Database["public"]["Enums"]["FindingStatus"] | null
          title: string
        }
        Insert: {
          auditRunId: string
          category: Database["public"]["Enums"]["FindingCategory"]
          createdAt?: string
          displayValue?: string | null
          id: string
          key: string
          severity: Database["public"]["Enums"]["FindingSeverity"]
          source: string
          status?: Database["public"]["Enums"]["FindingStatus"] | null
          title: string
        }
        Update: {
          auditRunId?: string
          category?: Database["public"]["Enums"]["FindingCategory"]
          createdAt?: string
          displayValue?: string | null
          id?: string
          key?: string
          severity?: Database["public"]["Enums"]["FindingSeverity"]
          source?: string
          status?: Database["public"]["Enums"]["FindingStatus"] | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "Finding_auditRunId_fkey"
            columns: ["auditRunId"]
            isOneToOne: false
            referencedRelation: "AuditRun"
            referencedColumns: ["id"]
          },
        ]
      }
      Metric: {
        Row: {
          auditRunId: string
          createdAt: string
          id: string
          key: string
          source: string
          unit: string | null
          value: number
        }
        Insert: {
          auditRunId: string
          createdAt?: string
          id: string
          key: string
          source: string
          unit?: string | null
          value: number
        }
        Update: {
          auditRunId?: string
          createdAt?: string
          id?: string
          key?: string
          source?: string
          unit?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "Metric_auditRunId_fkey"
            columns: ["auditRunId"]
            isOneToOne: false
            referencedRelation: "AuditRun"
            referencedColumns: ["id"]
          },
        ]
      }
      Project: {
        Row: {
          createdAt: string
          id: string
          name: string
          updatedAt: string
          url: string
          userId: string
        }
        Insert: {
          createdAt?: string
          id: string
          name: string
          updatedAt: string
          url: string
          userId: string
        }
        Update: {
          createdAt?: string
          id?: string
          name?: string
          updatedAt?: string
          url?: string
          userId?: string
        }
        Relationships: []
      }
      ProjectMember: {
        Row: {
          createdAt: string
          id: string
          invitedBy: string
          projectId: string
          role: Database["public"]["Enums"]["ProjectRole"]
          userId: string
        }
        Insert: {
          createdAt?: string
          id: string
          invitedBy: string
          projectId: string
          role: Database["public"]["Enums"]["ProjectRole"]
          userId: string
        }
        Update: {
          createdAt?: string
          id?: string
          invitedBy?: string
          projectId?: string
          role?: Database["public"]["Enums"]["ProjectRole"]
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "ProjectMember_projectId_fkey"
            columns: ["projectId"]
            isOneToOne: false
            referencedRelation: "Project"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      AlertOperator: "BELOW" | "ABOVE"
      AuditStatus: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED"
      FindingCategory:
        | "PERFORMANCE"
        | "ACCESSIBILITY"
        | "BEST_PRACTICES"
        | "SEO"
        | "STRUCTURED_DATA"
      FindingSeverity: "CRITICAL" | "WARNING" | "INFO" | "PASSED"
      FindingStatus: "NEW" | "RECURRING" | "RESOLVED"
      ProjectRole: "ANALYST" | "VIEWER"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      AlertOperator: ["BELOW", "ABOVE"],
      AuditStatus: ["PENDING", "RUNNING", "COMPLETED", "FAILED"],
      FindingCategory: [
        "PERFORMANCE",
        "ACCESSIBILITY",
        "BEST_PRACTICES",
        "SEO",
        "STRUCTURED_DATA",
      ],
      FindingSeverity: ["CRITICAL", "WARNING", "INFO", "PASSED"],
      FindingStatus: ["NEW", "RECURRING", "RESOLVED"],
      ProjectRole: ["ANALYST", "VIEWER"],
    },
  },
} as const
