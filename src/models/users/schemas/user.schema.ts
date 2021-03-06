import bcrypt from "bcryptjs";
import { Document, HookNextFunction, model, Schema } from "mongoose";
import { IUser, IUserDocument } from "../interfaces/user.interface";
import { IUserModel } from "@models/users/interfaces/user.interface";
import { HttpException } from "@common/exceptions/http-exception.filter";
import { StatusCodes } from "http-status-codes";
import { MongooseSchemaDefinition } from "@common/types/mongooseSchema.type";

export enum EMood {
  happy = "positive",
  angry = "negative",
  neutral = "neutral",
  mixed = "mixed",
}

export enum ELang {
  spanish = "es",
  french = "fr",
  english = "en",
}

const schemaDefinition: MongooseSchemaDefinition<IUser> = {
  name: {
    type: String,
    required: true,
    minlength: 2,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    minlength: 5,
    match: new RegExp(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/),
    trim: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 4,
    trim: true,
  },
  mood: {
    type: String,
    enum: Object.values(EMood),
    default: EMood.neutral,
  },
  lang: {
    type: String,
    enum: Object.values(ELang),
    default: ELang.spanish,
  },
  bornDate: {
    type: Date,
  },
};

const user = new Schema(schemaDefinition, {
  id: true,
  toJSON: {
    virtuals: true,
    versionKey: false,
    transform: (_: IUserDocument, ret: Partial<IUser & Document>) => {
      delete ret._id;
      delete ret.password;
      delete ret.timestamps?.createdAt;
      delete ret.timestamps?.updatedAt;
    },
  },
  timestamps: {
    createdAt: true,
    updatedAt: true,
  },
});

user.pre<IUserDocument>("save", async function (next: HookNextFunction) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 8);
  }

  next();
});

user.statics.emailExists = async function (
  this: IUserModel,
  email: IUser["email"],
  login = false
) {
  const user = await this.findOne({ email });

  if (user && !login) {
    throw new HttpException("Mail already in use", StatusCodes.BAD_REQUEST);
  }

  if (!user && login) {
    throw new HttpException("Invalid credentials", StatusCodes.BAD_REQUEST);
  }

  return user;
};

user.statics.userExists = async function (this: IUserModel, _id?: string) {
  const user = await this.findOne({ _id });

  if (!user) {
    throw new HttpException(
      "You aren't authenticated",
      StatusCodes.UNAUTHORIZED
    );
  }

  return user;
};

user.methods.comparePassword = async function (
  pass: string,
  userPass: IUserDocument["password"]
) {
  if (!(await bcrypt.compare(pass, userPass))) {
    throw new HttpException("Invalid credentials", StatusCodes.BAD_REQUEST);
  }
  return;
};

export default model<IUserDocument, IUserModel>("User", user);
