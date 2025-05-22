import { createBrowserClient } from '@supabase/ssr'

export const createClient = () => {
  return createBrowserClient(
    "https://eojyvdbezoxsbykekjga.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvanl2ZGJlem94c2J5a2VramdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4MDg0MDYsImV4cCI6MjA2MzM4NDQwNn0.AbBvUmUJ59DNeYW1iJ0sePbjz3PYdezT465eQiMAdeI"
  )
}
