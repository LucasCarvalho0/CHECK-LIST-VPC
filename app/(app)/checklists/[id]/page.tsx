'use client';
import { useParams } from 'next/navigation';
import ChecklistForm from '@/components/checklist/ChecklistForm';

export default function ChecklistPage() {
  const { id } = useParams<{ id: string }>();
  return <ChecklistForm id={id} />;
}
