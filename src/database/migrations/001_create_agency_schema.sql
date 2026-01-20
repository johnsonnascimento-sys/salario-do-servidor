-- Migration: 001_create_agency_schema.sql
-- Description: Sets up the base schema for multi-agency support.

-- Enable UUID extension if not enabled (usually standard in Supabase)
create extension if not exists "uuid-ossp";

-- 1. Agencies Table
-- Stores the list of distinct organizations (orgãos) supported by the SaaS.
create table if not exists agencies (
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    slug text not null unique, -- Identifier used in URL/Code (e.g., 'jmu', 'camara')
    type text check (type in ('JUDICIARY', 'EXECUTIVE', 'LEGISLATIVE')) not null,
    is_active boolean default true,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table agencies is 'Registry of supported government agencies (orgãos).';

-- 2. Salary Tables
-- Stores the base salary matrices (Vencimento Basico) which vary by agency and time.
create table if not exists salary_tables (
    id uuid default uuid_generate_v4() primary key,
    agency_id uuid references agencies(id) on delete cascade,
    role text not null, -- e.g., 'analista', 'tecnico'
    level text not null, -- e.g., 'C13', 'A1'
    amount numeric(10, 2) not null,
    valid_from date not null, -- To handle historical tables
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table salary_tables is 'Historical record of base salaries per agency/role/level.';

-- 3. Tax Rules (Optional/Future Proofing)
-- Stores configuration for taxes like IRRF and PSS if we want to decouple from code.
create table if not exists tax_rules (
    id uuid default uuid_generate_v4() primary key,
    agency_id uuid references agencies(id), -- Null means global/federal rule
    name text not null, -- e.g., 'PSS_2025', 'IRRF_MAY_2025'
    config jsonb not null, -- Stores brackets/rates: { "faixas": [...] }
    valid_from date not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

comment on table tax_rules is 'Configuration for tax calculations and brackets.';

-- 4. Initial Seed Data
-- Ensure JMU exists as the pioneer agency.
insert into agencies (slug, name, type, is_active)
values ('jmu', 'Superior Tribunal Militar', 'JUDICIARY', true)
on conflict (slug) do nothing;
