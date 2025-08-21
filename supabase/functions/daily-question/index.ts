import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
      },
    });
  }

  try {
    console.log("Fetching random question...");
    const { data: question, error: questionError } = await supabase
      .from('questions')
      .select('*')
      .order('RANDOM()')
      .limit(1)
      .single();

    if (questionError || !question) {
      console.log("Error fetching question:", questionError);
      throw new Error(questionError?.message || "No question found");
    }

    console.log("Inserting into daily_questions...");
    const { error: insertError } = await supabase
      .from('daily_questions')
      .insert({
        question_id: question.id,
        scheduled_for: new Date() // today
      });

    if (insertError) {
      console.log("Insert error:", insertError);
      throw new Error(insertError.message);
    }

    console.log("Success:", question);
    return new Response(JSON.stringify({ success: true, question }), {
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
    });

  } catch (err) {
    console.log("Function error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  }
});
