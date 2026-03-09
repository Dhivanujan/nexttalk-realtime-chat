"use client";

import { useForm, FieldValues, SubmitHandler } from "react-hook-form";
import axios from "axios";
import { CldUploadButton } from "next-cloudinary";
import { HiPaperAirplane, HiPhoto } from "react-icons/hi2";
import MessageInput from "./MessageInput";

interface ChatInputProps {
  conversationId: string;
}

import { getSocket } from "@/app/lib/socket";

// ...

const ChatInput: React.FC<ChatInputProps> = ({ conversationId }) => {
  const socket = getSocket();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FieldValues>({
    defaultValues: {
      message: "",
    },
  });

  const onSubmit: SubmitHandler<FieldValues> = (data) => {
    setValue("message", "", { shouldValidate: true });
    axios.post("/api/messages", {
      ...data,
      conversationId,
    }).then((response) => {
        socket.emit("send-message", response.data);
    });
  };

  const handleUpload = (result: any) => {
    axios.post("/api/messages", {
      image: result?.info?.secure_url,
      conversationId,
    }).then((response) => {
        socket.emit("send-message", response.data);
    });
  };

  return (
    <div
      className="
        py-4 
        px-4 
        bg-background/80
        backdrop-blur-md 
        border-t
        border-border
        flex 
        items-center 
        gap-2 
        lg:gap-4 
        w-full
      "
    >
      <CldUploadButton
        options={{ maxFiles: 1 }}
        onUpload={handleUpload}
        uploadPreset="nexttalk_preset"
      >
        <HiPhoto size={30} className="text-primary hover:text-primary/80 transition cursor-pointer" />
      </CldUploadButton>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex items-center gap-2 lg:gap-4 w-full"
      >
        <MessageInput
          id="message"
          register={register}
          errors={errors}
          required
          placeholder="Write a message"
        />
        <button
          type="submit"
          className="
            rounded-full 
            p-2 
            bg-primary 
            cursor-pointer 
            hover:bg-primary/90 
            transition
          "
        >
          <HiPaperAirplane size={18} className="text-white" />
        </button>
      </form>
    </div>
  );
};

export default ChatInput;
