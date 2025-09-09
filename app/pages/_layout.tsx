import { Stack } from 'expo-router';

export default function PagesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="accueil" />
      <Stack.Screen name="calendrier" />
      <Stack.Screen name="questions" />
      <Stack.Screen name="quizz" />
      <Stack.Screen name="reglages" />
      <Stack.Screen name="answer-question" />
      <Stack.Screen name="question-chat" />
      <Stack.Screen name="item-details" />
      <Stack.Screen name="todo-details" />
      <Stack.Screen name="todo-list" />
      <Stack.Screen name="create-todo" />
    </Stack>
  );
}
