"""Complete CRIS schema with Auth, Priority Scores, Alerts, Audit Logs, and PostGIS support

Revision ID: 0001_cris_schema
Revises:
Create Date: 2026-11-25 13:00:00
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0001_cris_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_exists(inspector, name: str) -> bool:
    return name in inspector.get_table_names()


def _col_exists(inspector, table: str, col: str) -> bool:
    return col in {c["name"] for c in inspector.get_columns(table)}


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if bind.dialect.name == "postgresql":
        op.execute("CREATE EXTENSION IF NOT EXISTS postgis")

    if not _table_exists(inspector, "users"):
        op.create_table(
            "users",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("username", sa.String(80), nullable=False, unique=True),
            sa.Column("email", sa.String(180), nullable=False, unique=True),
            sa.Column("full_name", sa.String(150), nullable=False),
            sa.Column("hashed_password", sa.String(255), nullable=False),
            sa.Column("role", sa.String(50), nullable=False, server_default="Viewer"),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("created_at", sa.DateTime(timezone=True)),
            sa.Column("updated_at", sa.DateTime(timezone=True)),
        )

    if not _table_exists(inspector, "incidents"):
        op.create_table(
            "incidents",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("incident_code", sa.String(50), nullable=False, unique=True),
            sa.Column("title", sa.String(255), nullable=False, server_default=""),
            sa.Column("incident_type", sa.String(100), nullable=False),
            sa.Column("description", sa.Text(), nullable=False),
            sa.Column("location", sa.String(255), nullable=False),
            sa.Column("latitude", sa.Float(), nullable=False),
            sa.Column("longitude", sa.Float(), nullable=False),
            sa.Column("severity", sa.Float(), nullable=False),
            sa.Column("impact", sa.Float(), nullable=False),
            sa.Column("urgency", sa.Float(), nullable=False),
            sa.Column("vulnerability", sa.Float(), nullable=False),
            sa.Column("accessibility", sa.Float(), nullable=False),
            sa.Column("people_affected", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("injuries", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("casualties", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("status", sa.String(50), nullable=False, server_default="REPORTED"),
            sa.Column("priority_score", sa.Float(), nullable=False, server_default="0.0"),
            sa.Column("priority_level", sa.String(20), nullable=False, server_default="LOW"),
            sa.Column("last_recalculated_at", sa.DateTime(timezone=True)),
            sa.Column("created_at", sa.DateTime(timezone=True)),
            sa.Column("updated_at", sa.DateTime(timezone=True)),
        )
    else:
        with op.batch_alter_table("incidents") as batch_op:
            if not _col_exists(inspector, "incidents", "title"):
                batch_op.add_column(sa.Column("title", sa.String(255), nullable=False, server_default=""))
            if not _col_exists(inspector, "incidents", "injuries"):
                batch_op.add_column(sa.Column("injuries", sa.Integer(), nullable=False, server_default="0"))
            if not _col_exists(inspector, "incidents", "casualties"):
                batch_op.add_column(sa.Column("casualties", sa.Integer(), nullable=False, server_default="0"))
            if not _col_exists(inspector, "incidents", "last_recalculated_at"):
                batch_op.add_column(sa.Column("last_recalculated_at", sa.DateTime(timezone=True)))

    if not _table_exists(inspector, "resources"):
        op.create_table(
            "resources",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("resource_code", sa.String(50), nullable=False, unique=True),
            sa.Column("resource_type", sa.String(80), nullable=False),
            sa.Column("name", sa.String(255), nullable=False),
            sa.Column("latitude", sa.Float(), nullable=False),
            sa.Column("longitude", sa.Float(), nullable=False),
            sa.Column("capacity", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("availability_status", sa.String(50), nullable=False, server_default="AVAILABLE"),
            sa.Column("current_location", sa.String(255), nullable=False),
            sa.Column("assigned_incident_id", sa.Integer(), sa.ForeignKey("incidents.id", ondelete="SET NULL"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True)),
            sa.Column("updated_at", sa.DateTime(timezone=True)),
        )
    else:
        with op.batch_alter_table("resources") as batch_op:
            if not _col_exists(inspector, "resources", "assigned_incident_id"):
                batch_op.add_column(sa.Column("assigned_incident_id", sa.Integer(), nullable=True))

    if not _table_exists(inspector, "resource_allocations"):
        op.create_table(
            "resource_allocations",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("incident_id", sa.Integer(), sa.ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False),
            sa.Column("resource_id", sa.Integer(), sa.ForeignKey("resources.id", ondelete="CASCADE"), nullable=False),
            sa.Column("distance_km", sa.Float(), nullable=False, server_default="0.0"),
            sa.Column("suitability_score", sa.Float(), nullable=False, server_default="0.0"),
            sa.Column("recommendation_reason", sa.Text(), nullable=True),
            sa.Column("allocation_notes", sa.Text(), nullable=True),
            sa.Column("decision_status", sa.String(30), nullable=False, server_default="ACCEPTED"),
            sa.Column("is_override", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("decided_by", sa.String(100), nullable=True),
            sa.Column("allocated_at", sa.DateTime(timezone=True)),
            sa.Column("released_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("status", sa.String(50), nullable=False, server_default="ACTIVE"),
        )
    else:
        with op.batch_alter_table("resource_allocations") as batch_op:
            for col_name, col_type in [
                ("suitability_score", sa.Float()),
                ("recommendation_reason", sa.Text()),
                ("decision_status", sa.String(30)),
                ("is_override", sa.Boolean()),
                ("decided_by", sa.String(100)),
                ("released_at", sa.DateTime(timezone=True)),
            ]:
                if not _col_exists(inspector, "resource_allocations", col_name):
                    batch_op.add_column(sa.Column(col_name, col_type, nullable=True))

    if not _table_exists(inspector, "incident_status_history"):
        op.create_table(
            "incident_status_history",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("incident_id", sa.Integer(), sa.ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False),
            sa.Column("previous_status", sa.String(50), nullable=True),
            sa.Column("new_status", sa.String(50), nullable=False),
            sa.Column("changed_by", sa.String(100)),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True)),
        )

    if not _table_exists(inspector, "demonstration_weights"):
        op.create_table(
            "demonstration_weights",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("severity_weight", sa.Float(), nullable=False, server_default="0.30"),
            sa.Column("impact_weight", sa.Float(), nullable=False, server_default="0.25"),
            sa.Column("urgency_weight", sa.Float(), nullable=False, server_default="0.20"),
            sa.Column("vulnerability_weight", sa.Float(), nullable=False, server_default="0.15"),
            sa.Column("accessibility_weight", sa.Float(), nullable=False, server_default="0.10"),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("updated_at", sa.DateTime(timezone=True)),
        )

    if not _table_exists(inspector, "priority_scores"):
        op.create_table(
            "priority_scores",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("incident_id", sa.Integer(), sa.ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False),
            sa.Column("priority_score", sa.Float(), nullable=False),
            sa.Column("priority_level", sa.String(20), nullable=False),
            sa.Column("severity_contribution", sa.Float(), nullable=False, server_default="0.0"),
            sa.Column("impact_contribution", sa.Float(), nullable=False, server_default="0.0"),
            sa.Column("urgency_contribution", sa.Float(), nullable=False, server_default="0.0"),
            sa.Column("vulnerability_contribution", sa.Float(), nullable=False, server_default="0.0"),
            sa.Column("accessibility_contribution", sa.Float(), nullable=False, server_default="0.0"),
            sa.Column("explanation", sa.Text(), nullable=False),
            sa.Column("weights_snapshot", sa.Text(), nullable=True),
            sa.Column("calculated_at", sa.DateTime(timezone=True)),
        )

    if not _table_exists(inspector, "alerts"):
        op.create_table(
            "alerts",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("alert_type", sa.String(60), nullable=False),
            sa.Column("severity", sa.String(20), nullable=False, server_default="HIGH"),
            sa.Column("title", sa.String(255), nullable=False),
            sa.Column("message", sa.Text(), nullable=False),
            sa.Column("incident_id", sa.Integer(), sa.ForeignKey("incidents.id", ondelete="CASCADE"), nullable=True),
            sa.Column("resource_id", sa.Integer(), sa.ForeignKey("resources.id", ondelete="CASCADE"), nullable=True),
            sa.Column("is_resolved", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("created_at", sa.DateTime(timezone=True)),
            sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        )

    if not _table_exists(inspector, "audit_logs"):
        op.create_table(
            "audit_logs",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("action", sa.String(80), nullable=False),
            sa.Column("entity_type", sa.String(50), nullable=False),
            sa.Column("entity_id", sa.String(50), nullable=True),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("username", sa.String(80), nullable=False, server_default="SYSTEM"),
            sa.Column("user_role", sa.String(50), nullable=False, server_default="SYSTEM"),
            sa.Column("details", sa.Text(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True)),
        )


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("alerts")
    op.drop_table("priority_scores")
    op.drop_table("demonstration_weights")
    op.drop_table("incident_status_history")
    op.drop_table("resource_allocations")
    op.drop_table("resources")
    op.drop_table("incidents")
    op.drop_table("users")

