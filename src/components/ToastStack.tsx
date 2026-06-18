import { Toast } from "@/components/ui/toast";

export function ToastStack() {
  return (
    <div className="flex w-full max-w-[460px] flex-col gap-4">
      <Toast
        variant="success"
        title="Successful toast"
        message="It's a green notification state"
      />
      <Toast
        variant="info"
        title="Neutral blue toast"
        message="It's a secondary notification state"
      />
      <Toast
        variant="ghost"
        title="App Notifications UI"
        message="Design tutorial for smart designers"
      />
    </div>
  );
}
