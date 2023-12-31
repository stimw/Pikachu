import { useCallback, useRef, useState } from "react";
import type { FileWithPath } from "react-dropzone";
import { useDropzone } from "react-dropzone";

import type {
  ExpandedRouteConfig,
  UploadThingError,
} from "@uploadthing/shared";
import type { UploadFileType } from "uploadthing/client";
import {
  classNames,
  generateClientDropzoneAccept,
  generateMimeTypes,
} from "uploadthing/client";
import type {
  ErrorMessage,
  FileRouter,
  inferEndpointInput,
  inferErrorShape,
} from "uploadthing/server";

// import { INTERNAL_uploadthingHookGen } from "./useUploadThing";
import { useUploadThing } from "@/utils/uploadthing";

const generatePermittedFileTypes = (config?: ExpandedRouteConfig) => {
  const fileTypes = config ? Object.keys(config) : [];

  const maxFileCount = config
    ? Object.values(config).map((v) => v.maxFileCount)
    : [];

  return { fileTypes, multiple: maxFileCount.some((v) => v && v > 1) };
};

const capitalizeStart = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const INTERNAL_doFormatting = (config?: ExpandedRouteConfig): string => {
  if (!config) return "";

  const allowedTypes = Object.keys(config) as (keyof ExpandedRouteConfig)[];

  const formattedTypes = allowedTypes.map((f) => {
    if (f.includes("/"))
      return `${(f.split("/")[1] as string).toUpperCase()} file`;
    return f === "blob" ? "file" : f;
  });

  // Format multi-type uploader label as "Supports videos, images and files";
  if (formattedTypes.length > 1) {
    const lastType = formattedTypes.pop();
    return `${formattedTypes.join("s, ")} and ${lastType as string}s`;
  }

  // Single type uploader label
  const key = allowedTypes[0];
  const formattedKey = formattedTypes[0];

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const { maxFileSize, maxFileCount } = config[key!]!;

  if (maxFileCount && maxFileCount > 1) {
    return `${
      formattedKey as string
    }s up to ${maxFileSize}, max ${maxFileCount}`;
  } else {
    return `${formattedKey as string} (${maxFileSize})`;
  }
};

const allowedContentTextLabelGenerator = (
  config?: ExpandedRouteConfig
): string => {
  return capitalizeStart(INTERNAL_doFormatting(config));
};

export type UploadthingComponentProps<TRouter extends FileRouter> = {
  [TEndpoint in keyof TRouter]: {
    endpoint: TEndpoint;

    onUploadProgress?: (progress: number) => void;
    onClientUploadComplete?: (
      res?: Awaited<ReturnType<UploadFileType<TRouter>>>
    ) => void;
    onUploadError?: (error: UploadThingError<inferErrorShape<TRouter>>) => void;
  } & (undefined extends inferEndpointInput<TRouter[TEndpoint]>
    ? // eslint-disable-next-line @typescript-eslint/ban-types
      {}
    : {
        input: inferEndpointInput<TRouter[TEndpoint]>;
      });
}[keyof TRouter];

const progressHeights: { [key: number]: string } = {
  0: "after:w-0",
  10: "after:w-[10%]",
  20: "after:w-[20%]",
  30: "after:w-[30%]",
  40: "after:w-[40%]",
  50: "after:w-[50%]",
  60: "after:w-[60%]",
  70: "after:w-[70%]",
  80: "after:w-[80%]",
  90: "after:w-[90%]",
  100: "after:w-[100%]",
};

/**
 * @example
 * <UploadButton<OurFileRouter>
 *   endpoint="someEndpoint"
 *   onUploadComplete={(res) => console.log(res)}
 *   onUploadError={(err) => console.log(err)}
 * />
 */
export function UploadButton<TRouter extends FileRouter>(
  props: FileRouter extends TRouter
    ? ErrorMessage<"You forgot to pass the generic">
    : UploadthingComponentProps<TRouter>
) {
  // Cast back to UploadthingComponentProps<TRouter> to get the correct type
  // since the ErrorMessage messes it up otherwise
  const $props = props as UploadthingComponentProps<TRouter>;
  // const useUploadThing = INTERNAL_uploadthingHookGen<TRouter>();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { startUpload, isUploading, permittedFileInfo } = useUploadThing(
    "imageUploader",
    {
      onClientUploadComplete: (res) => {
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        $props.onClientUploadComplete?.(res);
        setUploadProgress(0);
      },
      onUploadProgress: (p) => {
        setUploadProgress(p);
        $props.onUploadProgress?.(p);
      },
      onUploadError: $props.onUploadError,
    }
  );

  const { fileTypes, multiple } = generatePermittedFileTypes(
    permittedFileInfo?.config
  );

  const ready = fileTypes.length > 0;

  const getUploadButtonText = (fileTypes: string[]) => {
    if (!(fileTypes.length > 0)) return "Loading...";
    return `Choose File${multiple ? `(s)` : ``}`;
  };

  return (
    <div className="flex flex-col items-center justify-center gap-1">
      <label
        className={classNames(
          "relative flex h-10 w-36 cursor-pointer items-center justify-center overflow-hidden rounded-md after:transition-[width] after:duration-500",
          !ready && "cursor-not-allowed bg-zinc-400",
          ready &&
            isUploading &&
            `bg-zinc-400 after:absolute after:left-0 after:h-full after:bg-zinc-600 ${
              progressHeights[uploadProgress] as string
            }`,
          ready && !isUploading && "bg-zinc-600"
        )}
      >
        <input
          className="hidden"
          type="file"
          ref={fileInputRef}
          multiple={multiple}
          accept={generateMimeTypes(fileTypes ?? [])?.join(", ")}
          onChange={(e) => {
            if (!e.target.files) return;
            const input = "input" in $props ? $props.input : undefined;
            const files = Array.from(e.target.files);
            void startUpload(files, input);
          }}
          disabled={!ready}
        />
        <span className="z-10 px-3 py-2 text-white">
          {isUploading ? <Spinner /> : getUploadButtonText(fileTypes)}
        </span>
      </label>
      <div className="h-[1.25rem]">
        {fileTypes && (
          <p className="m-0 text-xs leading-5 text-gray-600">
            {allowedContentTextLabelGenerator(permittedFileInfo?.config)}
          </p>
        )}
      </div>
    </div>
  );
}

export function UploadDropzone<TRouter extends FileRouter>(
  props: FileRouter extends TRouter
    ? ErrorMessage<"You forgot to pass the generic">
    : UploadthingComponentProps<TRouter>
) {
  // Cast back to UploadthingComponentProps<TRouter> to get the correct type
  // since the ErrorMessage messes it up otherwise
  const $props = props as UploadthingComponentProps<TRouter>;
  // const useUploadThing = INTERNAL_uploadthingHookGen<TRouter>();

  const [files, setFiles] = useState<File[]>([]);
  const onDrop = useCallback((acceptedFiles: FileWithPath[]) => {
    setFiles(acceptedFiles);
  }, []);

  const [uploadProgress, setUploadProgress] = useState(0);
  const { startUpload, isUploading, permittedFileInfo } = useUploadThing(
    "imageUploader",
    {
      onClientUploadComplete: (res) => {
        setFiles([]);
        $props.onClientUploadComplete?.(res);
        setUploadProgress(0);
      },
      onUploadProgress: (p) => {
        setUploadProgress(p);
        $props.onUploadProgress?.(p);
      },
      onUploadError: $props.onUploadError,
    }
  );

  const { fileTypes } = generatePermittedFileTypes(permittedFileInfo?.config);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: fileTypes ? generateClientDropzoneAccept(fileTypes) : undefined,
  });

  const ready = fileTypes.length > 0;

  return (
    <div
      className={classNames(
        "mt-2 flex justify-center rounded-lg border border-dashed border-gray-900/25 px-6 py-10",
        isDragActive ? "bg-zinc-600/10" : ""
      )}
    >
      <div className="text-center" {...getRootProps()}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          className="mx-auto block h-12 w-12 align-middle text-gray-400"
        >
          <path
            fill="currentColor"
            fillRule="evenodd"
            d="M5.5 17a4.5 4.5 0 0 1-1.44-8.765a4.5 4.5 0 0 1 8.302-3.046a3.5 3.5 0 0 1 4.504 4.272A4 4 0 0 1 15 17H5.5Zm3.75-2.75a.75.75 0 0 0 1.5 0V9.66l1.95 2.1a.75.75 0 1 0 1.1-1.02l-3.25-3.5a.75.75 0 0 0-1.1 0l-3.25 3.5a.75.75 0 1 0 1.1 1.02l1.95-2.1v4.59Z"
            clipRule="evenodd"
          ></path>
        </svg>
        <div className="mt-4 flex text-sm leading-6 text-gray-600">
          <label
            htmlFor="file-upload"
            className={classNames(
              "relative cursor-pointer font-semibold  focus-within:outline-none focus-within:ring-2 focus-within:ring-zinc-600 focus-within:ring-offset-2 hover:text-zinc-500",
              ready ? "text-zinc-600" : "text-gray-500"
            )}
          >
            <span className="flex w-64 items-center justify-center">
              {ready ? `Choose files or drag and drop` : `Loading...`}
            </span>
            <input className="sr-only" {...getInputProps()} disabled={!ready} />
          </label>
        </div>
        <div className="h-[1.25rem]">
          <p className="m-0 text-xs leading-5 text-gray-600">
            {allowedContentTextLabelGenerator(permittedFileInfo?.config)}
          </p>
        </div>
        {files.length > 0 && (
          <div className="mt-4 flex items-center justify-center">
            <button
              className={classNames(
                "relative flex h-10 w-36 items-center justify-center overflow-hidden rounded-md after:transition-[width] after:duration-500",
                isUploading
                  ? `bg-zinc-400 after:absolute after:left-0 after:h-full after:bg-zinc-600 ${
                      progressHeights[uploadProgress] as string
                    }`
                  : "bg-zinc-600"
              )}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!files) return;

                const input = "input" in $props ? $props.input : undefined;
                void startUpload(files, input);
              }}
            >
              <span className="z-10 px-3 py-2 text-white">
                {isUploading ? (
                  <Spinner />
                ) : (
                  `Upload ${files.length} file${files.length === 1 ? "" : "s"}`
                )}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function Uploader<TRouter extends FileRouter>(
  props: FileRouter extends TRouter
    ? ErrorMessage<"You forgot to pass the generic">
    : UploadthingComponentProps<TRouter>
) {
  return (
    <>
      <div className="flex flex-col items-center justify-center gap-4">
        <span className="text-center text-4xl font-bold">
          {`Upload a file using a button:`}
        </span>
        {/* @ts-expect-error - this is validated above */}
        <UploadButton<TRouter> {...props} />
      </div>
      <div className="flex flex-col items-center justify-center gap-4">
        <span className="text-center text-4xl font-bold">
          {`...or using a dropzone:`}
        </span>
        {/* @ts-expect-error - this is validated above */}
        <UploadDropzone<TRouter> {...props} />
      </div>
    </>
  );
}

function Spinner() {
  return (
    <svg
      className="block h-5 w-5 animate-spin align-middle text-white"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 576 512"
    >
      <path
        fill="currentColor"
        d="M256 32C256 14.33 270.3 0 288 0C429.4 0 544 114.6 544 256C544 302.6 531.5 346.4 509.7 384C500.9 399.3 481.3 404.6 465.1 395.7C450.7 386.9 445.5 367.3 454.3 351.1C470.6 323.8 480 291 480 255.1C480 149.1 394 63.1 288 63.1C270.3 63.1 256 49.67 256 31.1V32z"
      />
    </svg>
  );
}

export function generateComponents<TRouter extends FileRouter>() {
  return {
    UploadButton: UploadButton<TRouter>,
    UploadDropzone: UploadDropzone<TRouter>,
    Uploader: Uploader<TRouter>,
  };
}
